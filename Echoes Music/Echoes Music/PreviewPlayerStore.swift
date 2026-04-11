//
//  PreviewPlayerStore.swift
//  Echoes Music
//

import AVFoundation
import Combine
import Foundation
import MusicKit

#if canImport(StoreKit)
import StoreKit
#endif

enum PlaybackEngine: String {
    case idle
    case preview
    case appleMusic
}

struct PlaybackQueueContext: Hashable {
    let prompt: String
    let conversationID: String
    let searchID: String
}

struct PlaybackQueueItem: Identifiable, Hashable {
    let id: String
    let song: Song
    let context: PlaybackQueueContext?

    init(song: Song, context: PlaybackQueueContext?) {
        self.id = "\(song.id)::\(context?.searchID ?? "standalone")"
        self.song = song
        self.context = context
    }
}

@MainActor
final class PreviewPlayerStore: ObservableObject {
    @Published private(set) var currentSongID: String?
    @Published private(set) var currentSong: Song?
    @Published private(set) var queue: [PlaybackQueueItem] = []
    @Published private(set) var currentIndex = 0
    @Published private(set) var isPlaying = false
    @Published private(set) var currentTime: TimeInterval = 0
    @Published private(set) var duration: TimeInterval = 0
    @Published private(set) var engine: PlaybackEngine = .idle

    @Published private(set) var spotifyConnection: SpotifyConnectionRecord?
    @Published private(set) var spotifyPlaylists: [StreamingPlaylist] = []
    @Published private(set) var isSpotifyLoading = false
    @Published private(set) var isSpotifyConnecting = false

    @Published private(set) var appleAuthorizationStatus = MusicAuthorization.currentStatus
    @Published private(set) var appleCanPlayCatalog = false
    @Published private(set) var appleHasCloudLibrary = false
    @Published private(set) var isAppleMusicLoading = false

    @Published private(set) var isSyncingFavorites = false
    @Published var lastError: String?

    var onPlaybackStarted: ((PlaybackQueueItem) -> Void)?

    private let service: SupabaseService
    private let config: EchoesConfig
    private let applePlayer = ApplicationMusicPlayer.shared

    private var previewPlayer: AVPlayer?
    private var previewTimeObserver: Any?
    private var previewDurationObservation: NSKeyValueObservation?
    private var previewRateObservation: NSKeyValueObservation?
    private var previewEndObserver: NSObjectProtocol?

    private var appleStateCancellable: AnyCancellable?
    private var appleQueueCancellable: AnyCancellable?
    private var appleClockTask: Task<Void, Never>?
    private var appleCatalogCache: [String: MusicKit.Song] = [:]
    private var previousApplePlaybackStatus: MusicKit.MusicPlayer.PlaybackStatus = .stopped
    private var isTransitioningBetweenTracks = false
    private var lastStartedQueueItemID: String?

    private var accessToken: String?
    private var userID: String?
    private var anonymousSessionID = ""

    private var favoritesSyncTask: Task<Void, Never>?

    private let spotifyPlaylistKey = "echoes.spotify.echoes-playlist-id"

#if !os(macOS)
    private let applePlaylistKey = "echoes.apple.echoes-playlist-id"
#endif

    init() {
        self.service = SupabaseService()
        self.config = EchoesConfig.shared
        bindApplePlayer()
        Task {
            await refreshAppleMusicStatus()
        }
    }

    init(service: SupabaseService, config: EchoesConfig) {
        self.service = service
        self.config = config
        bindApplePlayer()
        Task {
            await refreshAppleMusicStatus()
        }
    }

    var currentItem: PlaybackQueueItem? {
        guard queue.indices.contains(currentIndex) else { return nil }
        return queue[currentIndex]
    }

    var hasActivePlayer: Bool {
        currentSong != nil
    }

    var canGoNext: Bool {
        currentIndex < queue.count - 1
    }

    var canGoPrevious: Bool {
        currentIndex > 0 || currentTime > 3
    }

    var spotifyIsConnected: Bool {
        spotifyConnection != nil
    }

    var spotifyDisplayName: String? {
        spotifyConnection?.displayName
    }

    var spotifyIsPremium: Bool {
        spotifyConnection?.isPremium == true
    }

    var appleIsAuthorized: Bool {
        appleAuthorizationStatus == .authorized
    }

    var spotifyRedirectURL: URL {
        URL(string: "\(config.redirectScheme)://spotify/callback")!
    }

    func bootstrap(session: SupabaseSession?, anonymousSessionID: String) async {
        self.accessToken = session?.accessToken
        self.userID = session?.user.id
        self.anonymousSessionID = anonymousSessionID

        await refreshSpotifyConnection()
        await refreshAppleMusicStatus()
    }

    func handleIncomingURL(_ url: URL, session: SupabaseSession?, anonymousSessionID: String) async -> Bool {
        accessToken = session?.accessToken
        userID = session?.user.id
        self.anonymousSessionID = anonymousSessionID

        guard url.scheme == config.redirectScheme, url.host == "spotify" else {
            return false
        }

        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        if let errorDescription = components?.queryItems?.first(where: { $0.name == "error_description" })?.value ??
            components?.queryItems?.first(where: { $0.name == "error" })?.value {
            lastError = errorDescription
            return true
        }

        guard let accessToken else {
            lastError = "Sign in to Echoes before connecting Spotify."
            return true
        }

        guard let code = components?.queryItems?.first(where: { $0.name == "code" })?.value else {
            lastError = "Spotify did not return an authorization code."
            return true
        }

        isSpotifyConnecting = true
        defer { isSpotifyConnecting = false }

        do {
            let connection = try await service.exchangeSpotifyCode(
                code: code,
                redirectURI: spotifyRedirectURL.absoluteString,
                accessToken: accessToken,
                sessionID: anonymousSessionID
            )
            spotifyConnection = connection
            spotifyPlaylists = []
        } catch {
            lastError = error.localizedDescription
        }

        return true
    }

    func beginSpotifyConnection(session: SupabaseSession?, anonymousSessionID: String) async -> URL? {
        accessToken = session?.accessToken
        userID = session?.user.id
        self.anonymousSessionID = anonymousSessionID

        guard let accessToken else {
            lastError = "Sign in to Echoes before connecting Spotify."
            return nil
        }

        isSpotifyConnecting = true
        defer { isSpotifyConnecting = false }

        do {
            return try await service.spotifyAuthorizationURL(
                accessToken: accessToken,
                redirectURI: spotifyRedirectURL.absoluteString,
                sessionID: anonymousSessionID
            )
        } catch {
            lastError = error.localizedDescription
            return nil
        }
    }

    func disconnectSpotify() async {
        guard !anonymousSessionID.isEmpty else { return }
        do {
            try await service.disconnectSpotify(accessToken: accessToken, sessionID: anonymousSessionID)
            spotifyConnection = nil
            spotifyPlaylists = []
            EchoesStorage.remove(spotifyPlaylistKey)
        } catch {
            lastError = error.localizedDescription
        }
    }

    func refreshSpotifyConnection() async {
        guard !anonymousSessionID.isEmpty else { return }

        isSpotifyLoading = true
        defer { isSpotifyLoading = false }

        do {
            spotifyConnection = try await service.fetchSpotifyConnection(
                accessToken: accessToken,
                userID: userID,
                anonymousSessionID: anonymousSessionID
            )
            if spotifyConnection == nil {
                spotifyPlaylists = []
            }
        } catch {
            lastError = error.localizedDescription
        }
    }

    func loadSpotifyPlaylists() async {
        guard spotifyIsConnected else { return }
        guard !anonymousSessionID.isEmpty else { return }

        isSpotifyLoading = true
        defer { isSpotifyLoading = false }

        do {
            spotifyPlaylists = try await service.spotifyListPlaylists(
                accessToken: accessToken,
                sessionID: anonymousSessionID
            )
        } catch {
            lastError = error.localizedDescription
        }
    }

    func authorizeAppleMusic() async {
        isAppleMusicLoading = true
        let status = await MusicAuthorization.request()
        appleAuthorizationStatus = status
        await refreshAppleMusicStatus()
        isAppleMusicLoading = false
    }

    func refreshAppleMusicStatus() async {
        isAppleMusicLoading = true
        defer { isAppleMusicLoading = false }

        appleAuthorizationStatus = MusicAuthorization.currentStatus
        guard appleAuthorizationStatus == .authorized else {
            appleCanPlayCatalog = false
            appleHasCloudLibrary = false
            return
        }

        do {
            let subscription = try await MusicSubscription.current
            appleCanPlayCatalog = subscription.canPlayCatalogContent
            appleHasCloudLibrary = subscription.hasCloudLibraryEnabled
        } catch {
            appleCanPlayCatalog = false
            appleHasCloudLibrary = false
            lastError = error.localizedDescription
        }
    }

    func toggle(song: Song, queue songs: [Song]? = nil, context: PlaybackQueueContext? = nil) {
        if currentSongID == song.id {
            Task { await toggleCurrentPlayback() }
            return
        }

        play(songs: songs ?? [song], startingAt: song, context: context)
    }

    func play(songs: [Song], startingAt startingSong: Song, context: PlaybackQueueContext? = nil) {
        let builtQueue = songs.map { PlaybackQueueItem(song: $0, context: context) }
        guard let index = builtQueue.firstIndex(where: { $0.song.id == startingSong.id }) else { return }

        queue = builtQueue
        currentIndex = index

        Task {
            await loadCurrentItem(autoplay: true)
        }
    }

    func toggleCurrentPlayback() async {
        guard currentItem != nil else { return }

        switch engine {
        case .preview:
            if isPlaying {
                previewPlayer?.pause()
            } else {
                previewPlayer?.play()
                markPlaybackStartedIfNeeded()
            }
        case .appleMusic:
            do {
                if isPlaying {
                    applePlayer.pause()
                } else {
                    try await applePlayer.play()
                    markPlaybackStartedIfNeeded()
                }
            } catch {
                lastError = error.localizedDescription
            }
        case .idle:
            await loadCurrentItem(autoplay: true)
        }
    }

    func next() async {
        guard canGoNext else { return }
        currentIndex += 1
        await loadCurrentItem(autoplay: true)
    }

    func previous() async {
        if currentTime > 3 {
            seek(to: 0)
            return
        }

        guard currentIndex > 0 else {
            seek(to: 0)
            return
        }

        currentIndex -= 1
        await loadCurrentItem(autoplay: true)
    }

    func seek(to time: TimeInterval) {
        switch engine {
        case .preview:
            previewPlayer?.seek(to: CMTime(seconds: time, preferredTimescale: 600))
        case .appleMusic:
            applePlayer.playbackTime = time
        case .idle:
            break
        }
        currentTime = time
    }

    func isPlaying(song: Song) -> Bool {
        currentSongID == song.id && isPlaying
    }

    func saveToSpotifyLibrary(song: Song) async {
        guard let trackID = spotifyTrackID(for: song) else {
            lastError = "This track does not expose a Spotify identifier."
            return
        }
        guard spotifyIsConnected else {
            lastError = "Connect Spotify first."
            return
        }

        do {
            try await service.spotifySaveTracks(
                trackIDs: [trackID],
                accessToken: accessToken,
                sessionID: anonymousSessionID
            )
        } catch {
            lastError = error.localizedDescription
        }
    }

    func addToSpotifyPlaylist(song: Song, playlistID: String) async {
        guard let trackID = spotifyTrackID(for: song) else {
            lastError = "This track does not expose a Spotify identifier."
            return
        }
        do {
            try await service.spotifyAddTrackToPlaylist(
                playlistID: playlistID,
                trackID: trackID,
                accessToken: accessToken,
                sessionID: anonymousSessionID
            )
        } catch {
            lastError = error.localizedDescription
        }
    }

    func saveToAppleLibrary(song: Song) async {
#if os(macOS)
        lastError = "Apple Music library editing is currently available on iPhone and iPad."
#else
        guard appleIsAuthorized else {
            lastError = "Authorize Apple Music first."
            return
        }
        guard appleCanPlayCatalog else {
            lastError = "This Apple Music account cannot edit the library."
            return
        }
        guard let appleMusicID = song.appleMusicID else {
            lastError = "This track does not expose an Apple Music identifier."
            return
        }

        do {
            let catalogSong = try await catalogSong(for: appleMusicID)
            try await MusicLibrary.shared.add(catalogSong)
        } catch {
            lastError = error.localizedDescription
        }
#endif
    }

    func scheduleFavoritesSync(favorites: [Song], enabled: Bool) {
        favoritesSyncTask?.cancel()

        guard enabled else { return }
        guard spotifyIsConnected || appleIsAuthorized else { return }

        favoritesSyncTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 650_000_000)
            guard !Task.isCancelled else { return }
            await self?.syncFavoritesToProviders(favorites: favorites)
        }
    }

    private func syncFavoritesToProviders(favorites: [Song]) async {
        isSyncingFavorites = true
        defer { isSyncingFavorites = false }

        do {
            if spotifyIsConnected {
                let trackIDs = Array(Set(favorites.compactMap(spotifyTrackID(for:))))
                let playlistID = try await ensureSpotifyEchoesPlaylistID()
                try await service.spotifyReplacePlaylistTracks(
                    playlistID: playlistID,
                    trackIDs: trackIDs,
                    accessToken: accessToken,
                    sessionID: anonymousSessionID
                )
            }

#if !os(macOS)
            if appleIsAuthorized, appleCanPlayCatalog {
                try await syncAppleEchoesPlaylist(favorites: favorites)
            }
#endif
        } catch {
            lastError = error.localizedDescription
        }
    }

    private func loadCurrentItem(autoplay: Bool) async {
        guard let item = currentItem else {
            clearPlaybackSession()
            return
        }

        isTransitioningBetweenTracks = true
        defer { isTransitioningBetweenTracks = false }

        currentSongID = item.song.id
        currentSong = item.song
        currentTime = 0
        duration = 0
        lastStartedQueueItemID = nil

        clearPreviewPlayer()
        applePlayer.stop()

        if shouldUseAppleMusic(for: item.song), await startAppleMusicPlayback(for: item, autoplay: autoplay) {
            return
        }

        if let url = item.song.previewURLValue {
            startPreviewPlayback(for: item, url: url, autoplay: autoplay)
            return
        }

        engine = .idle
        isPlaying = false
        lastError = "No in-app playback is available for this track. Use the provider button."
    }

    private func shouldUseAppleMusic(for song: Song) -> Bool {
        appleIsAuthorized && appleCanPlayCatalog && song.appleMusicID?.isEmpty == false
    }

    private func startPreviewPlayback(for item: PlaybackQueueItem, url: URL, autoplay: Bool) {
        engine = .preview

        let playerItem = AVPlayerItem(url: url)
        let player = AVPlayer(playerItem: playerItem)
        previewPlayer = player

        previewRateObservation = player.observe(\.rate, options: [.initial, .new]) { [weak self] observedPlayer, _ in
            Task { @MainActor [weak self] in
                self?.isPlaying = observedPlayer.rate != 0
            }
        }

        previewDurationObservation = playerItem.observe(\.duration, options: [.initial, .new]) { [weak self] observedItem, _ in
            let seconds = observedItem.duration.seconds
            guard seconds.isFinite, !seconds.isNaN else { return }
            Task { @MainActor [weak self] in
                self?.duration = seconds
            }
        }

        previewTimeObserver = player.addPeriodicTimeObserver(
            forInterval: CMTime(seconds: 0.4, preferredTimescale: 600),
            queue: .main
        ) { [weak self] time in
            Task { @MainActor [weak self] in
                self?.currentTime = time.seconds.isFinite ? time.seconds : 0
            }
        }

        previewEndObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: playerItem,
            queue: .main
        ) { [weak self] _ in
            Task { await self?.handleTrackCompletion() }
        }

        if autoplay {
            player.play()
            markPlaybackStartedIfNeeded()
        }
    }

    private func startAppleMusicPlayback(for item: PlaybackQueueItem, autoplay: Bool) async -> Bool {
        guard let appleMusicID = item.song.appleMusicID else { return false }

        do {
            let catalogSong = try await catalogSong(for: appleMusicID)
            let queue = ApplicationMusicPlayer.Queue(for: [catalogSong], startingAt: catalogSong)
            if #available(iOS 26.4, macOS 26.4, *) {
                queue.affectsListeningHistory = true
            }

            applePlayer.queue = queue
            duration = catalogSong.duration ?? 0
            engine = .appleMusic

            if autoplay {
                try await applePlayer.play()
                markPlaybackStartedIfNeeded()
            } else {
                try await applePlayer.prepareToPlay()
            }

            syncApplePlaybackState()
            return true
        } catch {
            lastError = error.localizedDescription
            return false
        }
    }

    private func handleTrackCompletion() async {
        if canGoNext {
            currentIndex += 1
            await loadCurrentItem(autoplay: true)
            return
        }

        isPlaying = false
        currentTime = duration
    }

    private func bindApplePlayer() {
        appleStateCancellable = applePlayer.state.objectWillChange
            .receive(on: RunLoop.main)
            .sink { [weak self] in
                self?.syncApplePlaybackState()
            }

        appleQueueCancellable = applePlayer.queue.objectWillChange
            .receive(on: RunLoop.main)
            .sink { [weak self] in
                self?.syncApplePlaybackState()
            }

        appleClockTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 350_000_000)
                await MainActor.run {
                    guard let self, self.engine == .appleMusic else { return }
                    self.currentTime = max(0, self.applePlayer.playbackTime)
                }
            }
        }
    }

    private func syncApplePlaybackState() {
        guard engine == .appleMusic else { return }

        let status = applePlayer.state.playbackStatus
        isPlaying = status == .playing || status == .seekingForward || status == .seekingBackward

        if currentSong == nil, let entry = applePlayer.queue.currentEntry, let item = entry.item {
            switch item {
            case .song(let song):
                currentSongID = song.id.rawValue
                duration = song.duration ?? duration
            case .musicVideo:
                break
            @unknown default:
                break
            }
        }

        if previousApplePlaybackStatus == .playing, status == .stopped, !isTransitioningBetweenTracks {
            Task { await handleTrackCompletion() }
        }

        if status == .playing {
            markPlaybackStartedIfNeeded()
        }

        previousApplePlaybackStatus = status
    }

    private func markPlaybackStartedIfNeeded() {
        guard let item = currentItem else { return }
        guard lastStartedQueueItemID != item.id else { return }
        lastStartedQueueItemID = item.id
        onPlaybackStarted?(item)
    }

    private func clearPlaybackSession() {
        clearPreviewPlayer()
        applePlayer.stop()
        currentSongID = nil
        currentSong = nil
        isPlaying = false
        currentTime = 0
        duration = 0
        engine = .idle
    }

    private func clearPreviewPlayer() {
        if let previewTimeObserver, let previewPlayer {
            previewPlayer.removeTimeObserver(previewTimeObserver)
            self.previewTimeObserver = nil
        }
        if let previewEndObserver {
            NotificationCenter.default.removeObserver(previewEndObserver)
            self.previewEndObserver = nil
        }
        previewDurationObservation = nil
        previewRateObservation = nil
        previewPlayer?.pause()
        previewPlayer = nil
    }

    private func catalogSong(for appleMusicID: String) async throws -> MusicKit.Song {
        if let cached = appleCatalogCache[appleMusicID] {
            return cached
        }

        var request = MusicCatalogResourceRequest<MusicKit.Song>(
            matching: \.id,
            equalTo: MusicItemID(rawValue: appleMusicID)
        )
        request.limit = 1
        let response = try await request.response()
        guard let song = response.items.first else {
            throw SupabaseServiceError.server("Apple Music could not resolve this track.")
        }
        appleCatalogCache[appleMusicID] = song
        return song
    }

    private func spotifyTrackID(for song: Song) -> String? {
        guard let spotifyURI = song.spotifyURI?.trimmingCharacters(in: .whitespacesAndNewlines), !spotifyURI.isEmpty else {
            return nil
        }
        return spotifyURI.replacingOccurrences(of: "spotify:track:", with: "")
    }

    private func ensureSpotifyEchoesPlaylistID() async throws -> String {
        if let cached = EchoesStorage.defaults.string(forKey: spotifyPlaylistKey), !cached.isEmpty {
            return cached
        }
        let playlistID = try await service.spotifyEnsureEchoesPlaylist(
            accessToken: accessToken,
            sessionID: anonymousSessionID
        )
        EchoesStorage.defaults.set(playlistID, forKey: spotifyPlaylistKey)
        return playlistID
    }

#if !os(macOS)
    private func syncAppleEchoesPlaylist(favorites: [Song]) async throws {
        let songIDs = Array(Set(favorites.compactMap { $0.appleMusicID }))
        let songs = try await fetchAppleCatalogSongs(ids: songIDs)
        let playlist = try await ensureAppleEchoesPlaylist()
        _ = try await MusicLibrary.shared.edit(
            playlist,
            items: songs
        )
    }

    private func ensureAppleEchoesPlaylist() async throws -> MusicKit.Playlist {
        if let cachedID = EchoesStorage.defaults.string(forKey: applePlaylistKey), !cachedID.isEmpty {
            if let playlist = try await fetchAppleLibraryPlaylist(id: cachedID) {
                return playlist
            }
            EchoesStorage.remove(applePlaylistKey)
        }

        var request = MusicLibrarySearchRequest(term: "Echoes", types: [MusicKit.Playlist.self])
        request.limit = 25
        let response = try await request.response()
        if let existing = response.playlists.first(where: { $0.name.caseInsensitiveCompare("Echoes") == .orderedSame }) {
            EchoesStorage.defaults.set(existing.id.rawValue, forKey: applePlaylistKey)
            return existing
        }

        let created = try await MusicLibrary.shared.createPlaylist(
            name: "Echoes",
            description: "Favoriti sincronizzati da Echoes"
        )
        EchoesStorage.defaults.set(created.id.rawValue, forKey: applePlaylistKey)
        return created
    }

    private func fetchAppleLibraryPlaylist(id: String) async throws -> MusicKit.Playlist? {
        var request = MusicLibraryRequest<MusicKit.Playlist>()
        request.filter(matching: \.id, equalTo: MusicItemID(rawValue: id))
        let response = try await request.response()
        return response.items.first
    }

    private func fetchAppleCatalogSongs(ids: [String]) async throws -> [MusicKit.Song] {
        guard !ids.isEmpty else { return [] }
        let unresolvedIDs = ids.filter { appleCatalogCache[$0] == nil }

        if !unresolvedIDs.isEmpty {
            var request = MusicCatalogResourceRequest<MusicKit.Song>(
                matching: \.id,
                memberOf: unresolvedIDs.map { MusicItemID(rawValue: $0) }
            )
            request.limit = unresolvedIDs.count
            let response = try await request.response()
            for song in response.items {
                appleCatalogCache[song.id.rawValue] = song
            }
        }

        return ids.compactMap { appleCatalogCache[$0] }
    }
#endif
}
