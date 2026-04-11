//
//  EchoesStore.swift
//  Echoes Music
//

import Combine
import Foundation
import SwiftUI

@MainActor
final class EchoesStore: ObservableObject {
    @Published var selectedSection: AppSection = .discover
    @Published var session: SupabaseSession?
    @Published var profile: UserProfileRecord?
    @Published var tokenBalance: UserTokensRecord?
    @Published var subscription: SubscriptionRecord?
    @Published var userSettings: UserSettingsRecord
    @Published var favorites: [Song]
    @Published var conversations: [ConversationThread]
    @Published var activeConversationID: String?
    @Published var listenHistory: [ListenEntry]
    @Published var userTasteProfile: UserTasteProfile
    @Published var isBootstrapping = false
    @Published var hasBootstrapped = false
    @Published var isLoadingSearch = false
    @Published var isAuthenticating = false
    @Published var isAuthScreenPresented = false
    @Published var authPrompt: String?
    @Published var globalError: String?

    let anonymousSessionID: String

    private let service: SupabaseService
    private let previewMode: Bool

    init(service: SupabaseService, preview: Bool) {
        self.service = service
        self.previewMode = preview
        self.session = EchoesStorage.load(SupabaseSession?.self, key: EchoesStorageKeys.session, fallback: nil)
        self.favorites = EchoesStorage.load([Song].self, key: EchoesStorageKeys.favorites, fallback: [])
        self.conversations = EchoesStorage.load([ConversationThread].self, key: EchoesStorageKeys.conversations, fallback: [ConversationThread.blank()])
        self.listenHistory = EchoesStorage.load([ListenEntry].self, key: EchoesStorageKeys.listens, fallback: [])
        self.userTasteProfile = EchoesStorage.load(UserTasteProfile.self, key: EchoesStorageKeys.tasteProfile, fallback: .empty)
        self.userSettings = EchoesStorage.load(UserSettingsRecord.self, key: EchoesStorageKeys.settings, fallback: .fallback)
        self.activeConversationID = EchoesStorage.defaults.string(forKey: EchoesStorageKeys.activeConversationID)

        if let existingAnonymousID = EchoesStorage.defaults.string(forKey: EchoesStorageKeys.anonymousSessionID) {
            self.anonymousSessionID = existingAnonymousID
        } else {
            let newID = UUID().uuidString
            EchoesStorage.defaults.set(newID, forKey: EchoesStorageKeys.anonymousSessionID)
            self.anonymousSessionID = newID
        }

        if preview {
            self.session = nil
            self.profile = nil
            self.tokenBalance = nil
            self.subscription = nil
            self.userSettings = .fallback
            self.userTasteProfile = UserTasteProfile(
                globalSummary: "Tender songwriting, nocturnal pop and intimate indie textures.",
                userStandardAxes: StandardAxes(
                    moodLabel: "Melancholic but open",
                    energy: "medium",
                    intimacy: 4,
                    catharsis: "medium",
                    emotionalTension: "medium",
                    dominantThemes: ["nostalgia", "glow", "longing"]
                ),
                genreAffinityTags: ["indie", "dream-pop", "alternative"],
                preferredLanguages: ["en", "it"]
            )
            self.favorites = []
            self.listenHistory = []
            self.conversations = [
                ConversationThread(
                    id: UUID().uuidString,
                    title: "Late-night city walks",
                    updatedAt: Date(),
                    searches: [
                        SearchRecord(
                            id: UUID().uuidString,
                            prompt: "Music for walking alone through a city at night",
                            timestamp: Date(),
                            emotionalProfile: EmotionalProfile(
                                themes: ["solitude", "neon", "freedom"],
                                mood: "Reflective and alive",
                                energy: "Steady, cinematic pulse",
                                intimacy: "High",
                                catharsis: "Gentle release",
                                emotionalTension: "The thrill of being alone"
                            ),
                            songs: [
                                Song(
                                    id: "preview-1",
                                    title: "Midnight City",
                                    artist: "M83",
                                    album: "Hurry Up, We're Dreaming",
                                    releaseYear: 2011,
                                    artwork: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80",
                                    emotionalTags: ["neon", "motion", "release"],
                                    explanation: "The synth line captures that suspended moment between solitude and adrenaline.",
                                    relevanceScore: 94,
                                    provider: .spotify,
                                    spotifyURI: "spotify:track:1eyzqe2QqGZUmfcPZtrIyt",
                                    appleMusicID: nil,
                                    previewURL: nil
                                )
                            ],
                            adjacentInterpretations: ["Songs for neon rain", "Music for train rides after midnight"],
                            narrativeReply: "This cluster leans into motion, glow and private euphoria. It feels like the city is wide awake while your thoughts finally slow into focus."
                        )
                    ],
                    conversationMemory: nil
                )
            ]
            self.activeConversationID = conversations.first?.id
        }

        if activeConversation == nil {
            activeConversationID = conversations.first?.id
        }
    }

    var preferredColorScheme: ColorScheme? {
        userSettings.themePreference.colorScheme
    }

    var isSignedIn: Bool {
        session != nil
    }

    var activeConversation: ConversationThread? {
        guard let activeConversationID else { return conversations.first }
        return conversations.first(where: { $0.id == activeConversationID }) ?? conversations.first
    }

    func bootstrap() async {
        guard !hasBootstrapped, !isBootstrapping else { return }
        isBootstrapping = true
        defer {
            isBootstrapping = false
            hasBootstrapped = true
        }

        guard !previewMode else { return }

        do {
            if session?.isNearExpiry == true {
                try await refreshSessionIfNeeded(force: true)
            }
            try await refreshRemoteState()
        } catch {
            globalError = error.localizedDescription
        }
    }

    func beginGoogleSignIn() -> URL {
        let pkce = PKCEPayload.generate()
        EchoesStorage.defaults.set(pkce.verifier, forKey: EchoesStorageKeys.pkceVerifier)
        isAuthenticating = true
        return service.makeOAuthURL(provider: "google", redirectTo: EchoesConfig.shared.redirectURL, pkce: pkce)
    }

    func presentAuth(reason: String? = nil) {
        authPrompt = reason
        isAuthScreenPresented = true
    }

    func dismissAuth() {
        authPrompt = nil
        isAuthScreenPresented = false
    }

    func handleIncomingURL(_ url: URL) async {
        guard url.scheme == EchoesConfig.shared.redirectScheme else { return }

        let fragment = URLComponents(string: "echoes://callback?\(url.fragment ?? "")")
        let query = URLComponents(url: url, resolvingAgainstBaseURL: false)

        if let errorDescription = query?.queryItems?.first(where: { $0.name == "error_description" })?.value ??
            fragment?.queryItems?.first(where: { $0.name == "error_description" })?.value {
            isAuthenticating = false
            globalError = errorDescription
            return
        }

        if
            let accessToken = fragment?.queryItems?.first(where: { $0.name == "access_token" })?.value,
            let refreshToken = fragment?.queryItems?.first(where: { $0.name == "refresh_token" })?.value,
            let userID = fragment?.queryItems?.first(where: { $0.name == "user_id" })?.value
        {
            let session = SupabaseSession(
                accessToken: accessToken,
                refreshToken: refreshToken,
                tokenType: "bearer",
                expiresIn: nil,
                expiresAt: Int(Date().addingTimeInterval(3600).timeIntervalSince1970),
                user: SupabaseUser(
                    id: userID,
                    email: fragment?.queryItems?.first(where: { $0.name == "email" })?.value,
                    appMetadata: nil,
                    userMetadata: nil
                )
            )
            applyAuthenticatedSession(session)
            isAuthenticating = false
            return
        }

        guard let code = query?.queryItems?.first(where: { $0.name == "code" })?.value else {
            isAuthenticating = false
            return
        }

        let verifier = EchoesStorage.defaults.string(forKey: EchoesStorageKeys.pkceVerifier)
        EchoesStorage.remove(EchoesStorageKeys.pkceVerifier)

        guard let verifier else {
            isAuthenticating = false
            globalError = "Missing PKCE verifier for authentication."
            return
        }

        do {
            let newSession = try await service.exchangeCodeForSession(code: code, verifier: verifier)
            applyAuthenticatedSession(newSession)
            try await service.linkAnonymousSettings(
                accessToken: newSession.accessToken,
                userID: newSession.user.id,
                anonymousSessionID: anonymousSessionID
            )
            try await refreshRemoteState()
            dismissAuth()
        } catch {
            globalError = error.localizedDescription
        }

        isAuthenticating = false
    }

    func signOut() async {
        if let accessToken = session?.accessToken {
            await service.revokeSession(accessToken: accessToken)
        }
        session = nil
        profile = nil
        tokenBalance = nil
        subscription = nil
        dismissAuth()
        persist()

        do {
            if let settings = try await service.fetchUserSettings(accessToken: nil, userID: nil, anonymousSessionID: anonymousSessionID) {
                userSettings = settings
                persist()
            }
        } catch {
            globalError = error.localizedDescription
        }
    }

    func refreshRemoteState() async throws {
        let accessToken = try await validAccessToken()
        let userID = session?.user.id

        if let accessToken, let userID {
            async let fetchedProfile = service.fetchProfile(accessToken: accessToken, userID: userID)
            async let fetchedTokens = service.fetchTokens(accessToken: accessToken, userID: userID)
            async let fetchedSubscription = service.fetchSubscription(accessToken: accessToken, userID: userID)
            async let fetchedSettings = service.fetchUserSettings(accessToken: accessToken, userID: userID, anonymousSessionID: anonymousSessionID)

            profile = try await fetchedProfile
            tokenBalance = try await fetchedTokens
            subscription = try await fetchedSubscription
            userSettings = try await fetchedSettings ?? userSettings
        } else {
            userSettings = try await service.fetchUserSettings(accessToken: nil, userID: nil, anonymousSessionID: anonymousSessionID) ?? userSettings
        }

        persist()
    }

    func updateTheme(_ theme: EchoesTheme) async {
        userSettings = UserSettingsRecord(
            id: userSettings.id,
            userID: userSettings.userID,
            anonymousSessionID: userSettings.anonymousSessionID,
            allowAnonymizedImprovementData: userSettings.allowAnonymizedImprovementData,
            descriptionLanguage: userSettings.descriptionLanguage,
            syncFavoritesEchoesPlaylist: userSettings.syncFavoritesEchoesPlaylist,
            theme: theme.rawValue,
            uiLanguage: userSettings.uiLanguage
        )
        persist()

        do {
            let updated = try await service.upsertUserSettings(
                accessToken: try await validAccessToken(),
                userID: session?.user.id,
                anonymousSessionID: anonymousSessionID,
                patch: UserSettingsPatch(
                    userID: session?.user.id,
                    anonymousSessionID: anonymousSessionID,
                    allowAnonymizedImprovementData: nil,
                    descriptionLanguage: nil,
                    theme: theme.rawValue
                )
            )
            userSettings = updated
            persist()
        } catch {
            globalError = error.localizedDescription
        }
    }

    func updateDescriptionLanguage(_ language: DescriptionLanguage) async {
        userSettings = UserSettingsRecord(
            id: userSettings.id,
            userID: userSettings.userID,
            anonymousSessionID: userSettings.anonymousSessionID,
            allowAnonymizedImprovementData: userSettings.allowAnonymizedImprovementData,
            descriptionLanguage: language.rawValue,
            syncFavoritesEchoesPlaylist: userSettings.syncFavoritesEchoesPlaylist,
            theme: userSettings.theme,
            uiLanguage: userSettings.uiLanguage
        )
        persist()

        do {
            let updated = try await service.upsertUserSettings(
                accessToken: try await validAccessToken(),
                userID: session?.user.id,
                anonymousSessionID: anonymousSessionID,
                patch: UserSettingsPatch(
                    userID: session?.user.id,
                    anonymousSessionID: anonymousSessionID,
                    allowAnonymizedImprovementData: nil,
                    descriptionLanguage: language.rawValue,
                    theme: nil
                )
            )
            userSettings = updated
            persist()
        } catch {
            globalError = error.localizedDescription
        }
    }

    func updateAllowAnonymizedData(_ allow: Bool) async {
        userSettings = UserSettingsRecord(
            id: userSettings.id,
            userID: userSettings.userID,
            anonymousSessionID: userSettings.anonymousSessionID,
            allowAnonymizedImprovementData: allow,
            descriptionLanguage: userSettings.descriptionLanguage,
            syncFavoritesEchoesPlaylist: userSettings.syncFavoritesEchoesPlaylist,
            theme: userSettings.theme,
            uiLanguage: userSettings.uiLanguage
        )
        persist()

        do {
            let updated = try await service.upsertUserSettings(
                accessToken: try await validAccessToken(),
                userID: session?.user.id,
                anonymousSessionID: anonymousSessionID,
                patch: UserSettingsPatch(
                    userID: session?.user.id,
                    anonymousSessionID: anonymousSessionID,
                    allowAnonymizedImprovementData: allow,
                    descriptionLanguage: nil,
                    theme: nil
                )
            )
            userSettings = updated
            persist()
        } catch {
            globalError = error.localizedDescription
        }
    }

    func updateSyncFavoritesEchoesPlaylist(_ enabled: Bool) async {
        userSettings = UserSettingsRecord(
            id: userSettings.id,
            userID: userSettings.userID,
            anonymousSessionID: userSettings.anonymousSessionID,
            allowAnonymizedImprovementData: userSettings.allowAnonymizedImprovementData,
            descriptionLanguage: userSettings.descriptionLanguage,
            syncFavoritesEchoesPlaylist: enabled,
            theme: userSettings.theme,
            uiLanguage: userSettings.uiLanguage
        )
        persist()

        do {
            let updated = try await service.upsertUserSettings(
                accessToken: try await validAccessToken(),
                userID: session?.user.id,
                anonymousSessionID: anonymousSessionID,
                patch: UserSettingsPatch(
                    userID: session?.user.id,
                    anonymousSessionID: anonymousSessionID,
                    allowAnonymizedImprovementData: nil,
                    descriptionLanguage: nil,
                    syncFavoritesEchoesPlaylist: enabled,
                    theme: nil,
                    uiLanguage: nil
                )
            )
            userSettings = updated
            persist()
        } catch {
            globalError = error.localizedDescription
        }
    }

    func createConversation() {
        if !isSignedIn, conversations.count >= 1 {
            presentAuth(reason: "Sign in to keep multiple conversations in sync across devices.")
            return
        }

        let thread = ConversationThread.blank()
        conversations.insert(thread, at: 0)
        activeConversationID = thread.id
        persist()
    }

    func selectConversation(_ id: String) {
        activeConversationID = id
        EchoesStorage.defaults.set(id, forKey: EchoesStorageKeys.activeConversationID)
    }

    func deleteConversation(_ id: String) {
        if !isSignedIn, conversations.count <= 1 {
            globalError = "Without an account you can keep only one conversation."
            return
        }

        conversations.removeAll { $0.id == id }
        if activeConversationID == id {
            activeConversationID = conversations.first?.id
        }
        persist()
    }

    func toggleFavorite(_ song: Song) {
        if favorites.contains(song) {
            favorites.removeAll { $0.id == song.id }
        } else {
            favorites.insert(song, at: 0)
        }
        persist()
    }

    func isFavorite(_ song: Song) -> Bool {
        favorites.contains(song)
    }

    func clearFavorites() {
        favorites.removeAll()
        persist()
    }

    func recordListen(song: Song, prompt: String, conversationID: String, searchID: String) {
        if let latest = listenHistory.first,
           latest.song.id == song.id,
           latest.conversationID == conversationID,
           latest.searchID == searchID,
           Date().timeIntervalSince(latest.listenedAt) < 90 {
            return
        }

        let entry = ListenEntry(
            id: UUID().uuidString,
            listenedAt: Date(),
            conversationID: conversationID,
            searchID: searchID,
            prompt: prompt,
            song: song
        )
        listenHistory.insert(entry, at: 0)
        listenHistory = Array(listenHistory.prefix(150))
        persist()
    }

    func clearListenHistory() {
        listenHistory.removeAll()
        persist()
    }

    func renameConversation(_ id: String, title: String) {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        guard let index = conversations.firstIndex(where: { $0.id == id }) else { return }
        conversations[index].title = String(trimmed.prefix(48))
        persist()
    }

    func runSearch(prompt: String, mode: MusicSearchMode = .search) async {
        let trimmed = prompt.trimmingCharacters(in: .whitespacesAndNewlines)
        if mode == .search, trimmed.isEmpty { return }
        if isLoadingSearch { return }

        if activeConversation == nil {
            conversations = [ConversationThread.blank()]
            activeConversationID = conversations.first?.id
        }

        guard let conversationID = activeConversationID ?? conversations.first?.id else { return }

        isLoadingSearch = true
        defer { isLoadingSearch = false }

        do {
            let accessToken = try await validAccessToken()
            let thread = activeConversation ?? .blank(id: conversationID)

            let response = try await service.performSearch(
                request: MusicSearchRequest(
                    conversationID: conversationID,
                    prompt: mode == .lucky ? nil : trimmed,
                    descriptionLanguage: userSettings.descriptionPreference.rawValue,
                    mode: mode,
                    conversationMemory: thread.conversationMemory,
                    userTasteProfile: userTasteProfile,
                    anonymousSessionID: accessToken == nil ? anonymousSessionID : nil
                ),
                accessToken: accessToken
            )

            if let error = response.error {
                if response.code?.hasPrefix("anon_") == true {
                    presentAuth(reason: error)
                }
                throw SupabaseServiceError.server(error)
            }

            guard
                let emotionalProfile = response.emotionalProfile,
                let songs = response.songs,
                !songs.isEmpty
            else {
                throw SupabaseServiceError.server("No songs were returned for this request.")
            }

            let result = SearchRecord(
                id: UUID().uuidString,
                prompt: mode == .lucky ? "Surprise me" : trimmed,
                timestamp: Date(),
                emotionalProfile: emotionalProfile,
                songs: songs,
                adjacentInterpretations: response.adjacentInterpretations,
                narrativeReply: response.narrativeReply ?? ""
            )

            mergeSearchResult(result, into: conversationID, memory: response.conversationMemoryUpdate)
            mergeUserTaste(response.userTasteProfileUpdate)

            if accessToken != nil, let session {
                tokenBalance = try await service.fetchTokens(accessToken: session.accessToken, userID: session.user.id)
            }
        } catch {
            globalError = error.localizedDescription
        }
    }

    func refreshProfileData() async {
        do {
            try await refreshRemoteState()
        } catch {
            globalError = error.localizedDescription
        }
    }

    private func mergeSearchResult(_ result: SearchRecord, into conversationID: String, memory: ConversationMemory?) {
        if let index = conversations.firstIndex(where: { $0.id == conversationID }) {
            var thread = conversations[index]
            thread.updatedAt = result.timestamp
            thread.searches.append(result)
            if thread.searches.count == 1 {
                let seed = result.prompt.trimmingCharacters(in: .whitespacesAndNewlines)
                let limited = String(seed.prefix(44))
                thread.title = limited.isEmpty ? "New conversation" : limited
            }
            thread.conversationMemory = memory ?? thread.conversationMemory
            conversations[index] = thread
        } else {
            let created = ConversationThread(
                id: conversationID,
                title: String(result.prompt.prefix(44)),
                updatedAt: result.timestamp,
                searches: [result],
                conversationMemory: memory
            )
            conversations.insert(created, at: 0)
        }

        conversations.sort { $0.updatedAt > $1.updatedAt }
        activeConversationID = conversationID
        persist()
    }

    private func mergeUserTaste(_ update: UserTasteProfileUpdate?) {
        guard let update else { return }
        if let summary = update.globalSummary, !summary.isEmpty {
            userTasteProfile.globalSummary = summary
        }
        if let axes = update.userStandardAxes {
            userTasteProfile.userStandardAxes = axes
        }
        if let tags = update.genreAffinityTags, !tags.isEmpty {
            userTasteProfile.genreAffinityTags = tags
        }
        if let languages = update.preferredLanguages, !languages.isEmpty {
            userTasteProfile.preferredLanguages = languages
        }
        persist()
    }

    private func applyAuthenticatedSession(_ newSession: SupabaseSession) {
        session = newSession
        EchoesStorage.save(newSession, key: EchoesStorageKeys.session)
    }

    private func refreshSessionIfNeeded(force: Bool = false) async throws {
        guard let current = session else { return }
        guard force || current.isNearExpiry else { return }
        let refreshed = try await service.refreshSession(refreshToken: current.refreshToken)
        applyAuthenticatedSession(refreshed)
    }

    private func validAccessToken() async throws -> String? {
        guard session != nil else { return nil }
        do {
            try await refreshSessionIfNeeded()
            return session?.accessToken
        } catch {
            session = nil
            EchoesStorage.remove(EchoesStorageKeys.session)
            throw error
        }
    }

    private func persist() {
        EchoesStorage.save(session, key: EchoesStorageKeys.session)
        EchoesStorage.save(favorites, key: EchoesStorageKeys.favorites)
        EchoesStorage.save(conversations, key: EchoesStorageKeys.conversations)
        EchoesStorage.save(listenHistory, key: EchoesStorageKeys.listens)
        EchoesStorage.save(userTasteProfile, key: EchoesStorageKeys.tasteProfile)
        EchoesStorage.save(userSettings, key: EchoesStorageKeys.settings)
        EchoesStorage.defaults.set(activeConversationID, forKey: EchoesStorageKeys.activeConversationID)
    }
}
