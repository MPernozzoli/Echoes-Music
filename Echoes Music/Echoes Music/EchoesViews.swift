//
//  EchoesViews.swift
//  Echoes Music
//

import AuthenticationServices
import SwiftUI
import MusicKit
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

struct EchoesRootView: View {
    @EnvironmentObject private var store: EchoesStore
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
#if os(macOS)
        wideLayout
#else
        if horizontalSizeClass == .compact {
            compactLayout
        } else {
            wideLayout
        }
#endif
    }

    private var compactLayout: some View {
        TabView(selection: $store.selectedSection) {
            NavigationStack { DiscoverScreen() }
                .tag(AppSection.discover)
                .tabItem { Label("Discover", systemImage: AppSection.discover.systemImage) }

            NavigationStack { FavoritesScreen() }
                .tag(AppSection.favorites)
                .tabItem { Label("Favorites", systemImage: AppSection.favorites.systemImage) }

            NavigationStack { HistoryScreen() }
                .tag(AppSection.history)
                .tabItem { Label("History", systemImage: AppSection.history.systemImage) }

            NavigationStack { ProfileScreen() }
                .tag(AppSection.profile)
                .tabItem { Label("Profile", systemImage: AppSection.profile.systemImage) }
        }
    }

    private var wideLayout: some View {
        NavigationSplitView {
            SidebarPanel()
                .padding(20)
                .frame(minWidth: 270, idealWidth: 300)
                .background(EchoesPalette.appBackground)
        } detail: {
            NavigationStack {
                switch store.selectedSection {
                case .discover:
                    DiscoverScreen()
                case .favorites:
                    FavoritesScreen()
                case .history:
                    HistoryScreen()
                case .profile:
                    ProfileScreen()
                }
            }
        }
    }
}

struct SidebarPanel: View {
    @EnvironmentObject private var store: EchoesStore

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 10) {
                Text("Echoes")
                    .font(.system(size: 30, weight: .semibold, design: .serif))
                    .foregroundStyle(.white)
                Text("A native emotional search room for music discovery.")
                    .font(.subheadline)
                    .foregroundStyle(EchoesPalette.parchment.opacity(0.72))
            }

            VStack(spacing: 10) {
                ForEach(AppSection.allCases, id: \.self) { section in
                    Button {
                        store.selectedSection = section
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: section.systemImage)
                                .font(.headline)
                            Text(section.title)
                                .font(.headline)
                            Spacer()
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .fill(store.selectedSection == section ? EchoesPalette.sunset.opacity(0.24) : .white.opacity(0.04))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                                        .strokeBorder(.white.opacity(store.selectedSection == section ? 0.16 : 0.06))
                                )
                        )
                    }
                    .buttonStyle(.plain)
                }
            }

            if !store.isSignedIn {
                Button {
                    store.presentAuth(reason: "Sign in to sync your taste profile, token balance and chat history.")
                } label: {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Sign in")
                            .font(.headline)
                        Text("Unlock multi-device sync, multiple chats and account-backed settings.")
                            .font(.footnote)
                            .foregroundStyle(EchoesPalette.parchment.opacity(0.75))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(18)
                    .background(
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .fill(
                                LinearGradient(
                                    colors: [EchoesPalette.sunset.opacity(0.32), EchoesPalette.rose.opacity(0.2)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    )
                }
                .buttonStyle(.plain)
            }

            Spacer()

            VStack(alignment: .leading, spacing: 8) {
                if let balance = store.tokenBalance?.balance {
                    StatPill(title: "\(balance)", subtitle: "Tokens", accent: EchoesPalette.sunset)
                }
                if !store.userTasteProfile.genreAffinityTags.isEmpty {
                    Text("Taste drift")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(EchoesPalette.parchment.opacity(0.55))
                    FlowLayout(spacing: 8) {
                        ForEach(store.userTasteProfile.genreAffinityTags.prefix(4), id: \.self) { tag in
                            TagChip(text: tag, fill: .white.opacity(0.06), foreground: .white)
                        }
                    }
                }
            }
        }
    }
}

struct DiscoverScreen: View {
    @EnvironmentObject private var store: EchoesStore
    @EnvironmentObject private var previewPlayer: PreviewPlayerStore
    @State private var draft = ""
    @State private var renameTarget: ConversationThread?
    @State private var renameDraft = ""

    private let promptSuggestions = [
        "Songs for healing after something beautiful ended",
        "Music for late trains and empty stations",
        "Tracks that feel like sunlight after a hard week",
        "Italian songs for quiet resilience",
        "Dreamy indie for a long night drive",
        "Music that sounds like emotional relief",
    ]

    var body: some View {
        GeometryReader { proxy in
            let wide = proxy.size.width > 1020

            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    topMarquee

                    if !store.isSignedIn {
                        guestRibbon
                    }

                    if wide {
                        HStack(alignment: .top, spacing: 22) {
                            conversationsColumn
                                .frame(width: 288)
                            mainColumn
                        }
                    } else {
                        mainColumn
                    }
                }
                .padding(wide ? 28 : 20)
            }
            .background(EchoesPalette.appBackground)
            .sheet(item: $renameTarget) { conversation in
                RenameConversationSheet(
                    title: $renameDraft,
                    onSave: {
                        store.renameConversation(conversation.id, title: renameDraft)
                        renameTarget = nil
                    },
                    onCancel: {
                        renameTarget = nil
                    }
                )
                .presentationDetents([.height(220)])
            }
            .toolbar {
                ToolbarItemGroup(placement: .primaryAction) {
                    Button {
                        store.createConversation()
                    } label: {
                        Label("New Chat", systemImage: "plus")
                    }

                    if !store.isSignedIn {
                        Button {
                            store.presentAuth(reason: "Sign in to keep more than one conversation and sync it across devices.")
                        } label: {
                            Label("Sign In", systemImage: "person.badge.key")
                        }
                    }
                }
            }
        }
    }

    private var topMarquee: some View {
        HStack(alignment: .top, spacing: 20) {
            VStack(alignment: .leading, spacing: 16) {
                Text("A sharper, native room for musical intuition.")
                    .font(.system(size: 40, weight: .semibold, design: .serif))
                    .foregroundStyle(.white)
                Text("Less dashboard, more editorial listening space. Echoes reads the emotional contour of a prompt and routes the same backend intelligence into a calmer native surface.")
                    .font(.body)
                    .foregroundStyle(EchoesPalette.parchment.opacity(0.8))
            }

            Spacer(minLength: 0)

            VStack(alignment: .leading, spacing: 10) {
                StatPill(title: "\(store.conversations.count)", subtitle: "Conversations", accent: EchoesPalette.sunset)
                StatPill(title: "\(store.favorites.count)", subtitle: "Saved Tracks", accent: EchoesPalette.rose)
                if let balance = store.tokenBalance?.balance {
                    StatPill(title: "\(balance)", subtitle: "Tokens Left", accent: EchoesPalette.mist)
                }
            }
            .frame(maxWidth: 220)
        }
        .padding(24)
        .background(
            HeroPanel()
        )
    }

    private var guestRibbon: some View {
        HStack(spacing: 14) {
            Image(systemName: "sparkles")
                .font(.headline)
                .foregroundStyle(EchoesPalette.sunset)
            VStack(alignment: .leading, spacing: 4) {
                Text("Guest mode is active")
                    .font(.headline)
                    .foregroundStyle(.white)
                Text("You can explore one conversation anonymously. Sign in when you want synced history, profile data and multiple threads.")
                    .font(.footnote)
                    .foregroundStyle(EchoesPalette.parchment.opacity(0.74))
            }
            Spacer()
            Button("Sign In") {
                store.presentAuth(reason: "Continue with Google to sync Echoes across iPhone, iPad and Mac.")
            }
            .buttonStyle(.borderedProminent)
            .tint(EchoesPalette.sunset)
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(.white.opacity(0.06))
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .strokeBorder(EchoesPalette.sunset.opacity(0.18))
                )
        )
    }

    private var conversationsColumn: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Conversations")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.white)
                Spacer()
                if let active = store.activeConversation {
                    Button {
                        renameDraft = active.title
                        renameTarget = active
                    } label: {
                        Image(systemName: "pencil")
                    }
                    .buttonStyle(.bordered)
                }
            }

            ForEach(store.conversations.sorted(by: { $0.updatedAt > $1.updatedAt })) { conversation in
                Button {
                    store.selectConversation(conversation.id)
                } label: {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(conversation.title)
                            .font(.headline)
                            .foregroundStyle(.white)
                            .lineLimit(2)
                        Text(conversation.updatedAt.formatted(date: .abbreviated, time: .shortened))
                            .font(.caption)
                            .foregroundStyle(EchoesPalette.parchment.opacity(0.62))
                        if let mood = conversation.searches.last?.emotionalProfile.mood {
                            Text(mood)
                                .font(.footnote)
                                .foregroundStyle(EchoesPalette.parchment.opacity(0.76))
                                .lineLimit(2)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .fill(store.activeConversationID == conversation.id ? .white.opacity(0.11) : .white.opacity(0.045))
                            .overlay(
                                RoundedRectangle(cornerRadius: 24, style: .continuous)
                                    .strokeBorder(.white.opacity(store.activeConversationID == conversation.id ? 0.12 : 0.04))
                            )
                    )
                }
                .buttonStyle(.plain)
                .contextMenu {
                    Button {
                        renameDraft = conversation.title
                        renameTarget = conversation
                    } label: {
                        Label("Rename", systemImage: "pencil")
                    }

                    Button(role: .destructive) {
                        store.deleteConversation(conversation.id)
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
            }
        }
        .padding(20)
        .background(GlassPanel(cornerRadius: 30))
    }

    private var mainColumn: some View {
        VStack(alignment: .leading, spacing: 22) {
            composerCard

            if store.isLoadingSearch {
                loadingCard
            }

            if let conversation = store.activeConversation, !conversation.searches.isEmpty {
                ForEach(conversation.searches.reversed()) { result in
                    SearchResultCard(result: result, conversationID: conversation.id)
                }
            } else {
                EmptyPane(
                    title: "Start from a feeling",
                    bodyText: "Ask for grief without melodrama, nocturnal motion, tenderness after distance, or anything else that already has emotional temperature."
                )
            }
        }
    }

    private var composerCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(store.activeConversation?.title ?? "New conversation")
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(.white)
                    Text("Write a mood, memory, image or contradiction.")
                        .font(.subheadline)
                        .foregroundStyle(EchoesPalette.parchment.opacity(0.72))
                }
                Spacer()
                if !store.userTasteProfile.globalSummary.isEmpty {
                    Text(store.userTasteProfile.globalSummary)
                        .font(.caption)
                        .foregroundStyle(EchoesPalette.parchment.opacity(0.66))
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 220, alignment: .trailing)
                }
            }

            TextEditor(text: $draft)
                .scrollContentBackground(.hidden)
                .font(.body)
                .frame(minHeight: 132)
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(.black.opacity(0.22))
                        .overlay(
                            RoundedRectangle(cornerRadius: 24, style: .continuous)
                                .strokeBorder(.white.opacity(0.08))
                        )
                )
                .foregroundStyle(.white)

            FlowLayout(spacing: 10) {
                ForEach(promptSuggestions, id: \.self) { suggestion in
                    Button(suggestion) { draft = suggestion }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(.white.opacity(0.06), in: Capsule())
                        .foregroundStyle(EchoesPalette.parchment)
                }
            }

            HStack(spacing: 12) {
                Button {
                    let text = draft
                    draft = ""
                    Task { await store.runSearch(prompt: text) }
                } label: {
                    Label("Read My Mood", systemImage: "waveform.path.ecg")
                        .font(.headline)
                }
                .buttonStyle(.borderedProminent)
                .tint(EchoesPalette.sunset)
                .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.isLoadingSearch)

                Button {
                    Task { await store.runSearch(prompt: "", mode: .lucky) }
                } label: {
                    Label("Lucky Pull", systemImage: "wand.and.stars.inverse")
                }
                .buttonStyle(.bordered)
                .foregroundStyle(.white)
                .disabled(store.isLoadingSearch)
            }
        }
        .padding(24)
        .background(GlassPanel(cornerRadius: 30))
    }

    private var loadingCard: some View {
        HStack(spacing: 16) {
            ProgressView()
                .tint(EchoesPalette.sunset)
            VStack(alignment: .leading, spacing: 4) {
                Text("Listening for signal")
                    .font(.headline)
                    .foregroundStyle(.white)
                Text("Echoes is asking the shared backend to shape songs, narrative and emotional profile for this prompt.")
                    .font(.footnote)
                    .foregroundStyle(EchoesPalette.parchment.opacity(0.72))
            }
            Spacer()
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(.white.opacity(0.05))
        )
    }
}

struct SearchResultCard: View {
    @EnvironmentObject private var store: EchoesStore
    @EnvironmentObject private var previewPlayer: PreviewPlayerStore
    @Environment(\.openURL) private var openURL

    let result: SearchRecord
    let conversationID: String

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(result.prompt)
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.white)
                    Text(result.timestamp.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundStyle(EchoesPalette.parchment.opacity(0.62))
                }
                Spacer()
                if let topScore = result.songs.first?.relevanceScore {
                    StatPill(title: "\(topScore)", subtitle: "Top Match", accent: EchoesPalette.sunset)
                        .frame(width: 120)
                }
            }

            if !result.narrativeReply.isEmpty {
                Text(result.narrativeReply)
                    .font(.body)
                    .foregroundStyle(EchoesPalette.parchment.opacity(0.88))
                    .padding(18)
                    .background(
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .fill(.black.opacity(0.14))
                    )
            }

            EmotionalProfileView(profile: result.emotionalProfile)

            VStack(spacing: 14) {
                    ForEach(result.songs) { song in
                        SongRow(song: song) {
                            previewPlayer.toggle(
                                song: song,
                                queue: result.songs,
                                context: PlaybackQueueContext(
                                    prompt: result.prompt,
                                    conversationID: conversationID,
                                    searchID: result.id
                                )
                            )
                        } favoriteAction: {
                            store.toggleFavorite(song)
                        } openAction: {
                            if let url = song.deepLinkURL {
                                openURL(url)
                        }
                    }
                }
            }

            if !result.adjacentInterpretations.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Explore next")
                        .font(.headline)
                        .foregroundStyle(.white)
                    FlowLayout(spacing: 10) {
                        ForEach(result.adjacentInterpretations, id: \.self) { item in
                            Button(item) {
                                Task { await store.runSearch(prompt: item) }
                            }
                            .buttonStyle(.plain)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 9)
                            .background(EchoesPalette.sunset.opacity(0.12), in: Capsule())
                            .foregroundStyle(.white)
                        }
                    }
                }
            }
        }
        .padding(24)
        .background(GlassPanel(cornerRadius: 32))
    }
}

struct EmotionalProfileView: View {
    let profile: EmotionalProfile

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Emotional profile")
                .font(.headline)
                .foregroundStyle(.white)

            FlowLayout(spacing: 8) {
                ForEach(profile.themes, id: \.self) { theme in
                    TagChip(text: theme, fill: EchoesPalette.sunset.opacity(0.18), foreground: .white)
                }
            }

            Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 12) {
                GridRow {
                    profileCell("Mood", profile.mood)
                    profileCell("Energy", profile.energy)
                }
                GridRow {
                    profileCell("Intimacy", profile.intimacy)
                    profileCell("Catharsis", profile.catharsis)
                }
                GridRow {
                    profileCell("Tension", profile.emotionalTension)
                    Spacer()
                }
            }
            .padding(18)
            .background(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(.white.opacity(0.04))
            )
        }
    }

    @ViewBuilder
    private func profileCell(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title.uppercased())
                .font(.caption2.weight(.bold))
                .foregroundStyle(EchoesPalette.parchment.opacity(0.55))
            Text(value)
                .font(.footnote)
                .foregroundStyle(EchoesPalette.parchment.opacity(0.82))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SongRow: View {
    @EnvironmentObject private var store: EchoesStore
    @EnvironmentObject private var previewPlayer: PreviewPlayerStore

    let song: Song
    let playAction: () -> Void
    let favoriteAction: () -> Void
    let openAction: () -> Void

    var body: some View {
        let canUseApplePlayback = previewPlayer.appleIsAuthorized && previewPlayer.appleCanPlayCatalog && song.appleMusicID != nil

        HStack(alignment: .top, spacing: 16) {
            AsyncImage(url: song.artworkURL) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Rectangle().fill(.white.opacity(0.08))
            }
            .frame(width: 92, height: 92)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(alignment: .bottomTrailing) {
                if let year = song.releaseYear {
                    Text(String(year))
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(.black.opacity(0.55), in: Capsule())
                        .padding(8)
                }
            }

            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(song.title)
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text("\(song.artist) • \(song.album)")
                            .font(.subheadline)
                            .foregroundStyle(EchoesPalette.parchment.opacity(0.76))
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 6) {
                        Text("\(song.relevanceScore)")
                            .font(.title3.weight(.bold))
                            .foregroundStyle(EchoesPalette.sunset)
                        Text("match")
                            .font(.caption2)
                            .foregroundStyle(EchoesPalette.parchment.opacity(0.55))
                    }
                }

                Text(song.explanation)
                    .font(.footnote)
                    .foregroundStyle(EchoesPalette.parchment.opacity(0.82))

                FlowLayout(spacing: 8) {
                    ForEach(song.emotionalTags, id: \.self) { tag in
                        TagChip(text: tag, fill: .white.opacity(0.06), foreground: EchoesPalette.parchment)
                    }
                }

                HStack(spacing: 10) {
                    if song.previewURLValue != nil || canUseApplePlayback {
                        Button {
                            playAction()
                        } label: {
                            Label(previewPlayer.isPlaying(song: song) ? "Pause" : (canUseApplePlayback ? "Play" : "Play Preview"),
                                  systemImage: previewPlayer.isPlaying(song: song) ? "pause.fill" : "play.fill")
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(EchoesPalette.sunset)
                    }

                    Button {
                        favoriteAction()
                    } label: {
                        Label(store.isFavorite(song) ? "Saved" : "Save", systemImage: store.isFavorite(song) ? "heart.fill" : "heart")
                    }
                    .buttonStyle(.bordered)

                    if song.deepLinkURL != nil {
                        Button {
                            openAction()
                        } label: {
                            Label(song.providerLabel, systemImage: "arrow.up.right.square")
                        }
                        .buttonStyle(.bordered)
                    }

                    Menu {
                        if previewPlayer.spotifyIsConnected {
                            Button("Save to Spotify Likes") {
                                Task { await previewPlayer.saveToSpotifyLibrary(song: song) }
                            }

                            if previewPlayer.spotifyPlaylists.isEmpty {
                                Button("Load Spotify Playlists") {
                                    Task { await previewPlayer.loadSpotifyPlaylists() }
                                }
                            } else {
                                ForEach(previewPlayer.spotifyPlaylists) { playlist in
                                    Button("Add to \(playlist.name)") {
                                        Task { await previewPlayer.addToSpotifyPlaylist(song: song, playlistID: playlist.id) }
                                    }
                                }
                            }
                        } else {
                            Text("Connect Spotify in Profile")
                        }

                        if song.appleMusicID != nil {
                            Divider()
                            if previewPlayer.appleIsAuthorized {
                                Button("Add to Apple Music Library") {
                                    Task { await previewPlayer.saveToAppleLibrary(song: song) }
                                }
                            } else {
                                Text("Authorize Apple Music in Profile")
                            }
                        }
                    } label: {
                        Label("Services", systemImage: "music.note.list")
                    }
                    .buttonStyle(.bordered)
                }
            }
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(.black.opacity(0.16))
                .overlay(
                    RoundedRectangle(cornerRadius: 26, style: .continuous)
                        .strokeBorder(.white.opacity(0.05))
                )
        )
    }
}

struct FavoritesScreen: View {
    @EnvironmentObject private var store: EchoesStore
    @EnvironmentObject private var previewPlayer: PreviewPlayerStore
    @Environment(\.openURL) private var openURL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                HeaderBlock(
                    eyebrow: "Collection",
                    title: "Favorites",
                    subtitle: "A quieter shelf for the tracks that survived your first reaction."
                )

                if store.favorites.isEmpty {
                    EmptyPane(
                        title: "No favorites yet",
                        bodyText: "Save tracks from a discovery result and they will stay here as a personal shelf."
                    )
                } else {
                    HStack {
                        Spacer()
                        Button(role: .destructive) {
                            store.clearFavorites()
                        } label: {
                            Label("Clear Favorites", systemImage: "trash")
                        }
                        .buttonStyle(.bordered)
                    }

                    ForEach(store.favorites) { song in
                        SongRow(song: song) {
                            previewPlayer.toggle(song: song)
                        } favoriteAction: {
                            store.toggleFavorite(song)
                        } openAction: {
                            if let url = song.deepLinkURL {
                                openURL(url)
                            }
                        }
                    }
                }
            }
            .padding(24)
        }
        .background(EchoesPalette.appBackground)
    }
}

struct HistoryScreen: View {
    @EnvironmentObject private var store: EchoesStore
    @EnvironmentObject private var previewPlayer: PreviewPlayerStore
    @State private var tab: HistoryTab = .chats
    @State private var renameTarget: ConversationThread?
    @State private var renameDraft = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                HeaderBlock(
                    eyebrow: "Memory",
                    title: "History",
                    subtitle: "Threads and plays, kept local and shaped by the same emotional search context."
                )

                Picker("History", selection: $tab) {
                    Text("Chats").tag(HistoryTab.chats)
                    Text("Plays").tag(HistoryTab.plays)
                }
                .pickerStyle(.segmented)

                if tab == .chats {
                    chats
                } else {
                    plays
                }
            }
            .padding(24)
        }
        .background(EchoesPalette.appBackground)
        .sheet(item: $renameTarget) { conversation in
            RenameConversationSheet(
                title: $renameDraft,
                onSave: {
                    store.renameConversation(conversation.id, title: renameDraft)
                    renameTarget = nil
                },
                onCancel: {
                    renameTarget = nil
                }
            )
            .presentationDetents([.height(220)])
        }
    }

    private var chats: some View {
        VStack(spacing: 12) {
            if store.conversations.isEmpty {
                EmptyPane(title: "No conversations yet", bodyText: "Run a search from Discover and the native app will keep the thread here.")
            } else {
                ForEach(store.conversations.sorted(by: { $0.updatedAt > $1.updatedAt })) { conversation in
                    VStack(alignment: .leading, spacing: 10) {
                        Button {
                            store.selectConversation(conversation.id)
                            store.selectedSection = .discover
                        } label: {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(conversation.title)
                                    .font(.headline)
                                    .foregroundStyle(.white)
                                    .lineLimit(2)
                                Text(conversation.updatedAt.formatted(date: .abbreviated, time: .shortened))
                                    .font(.caption)
                                    .foregroundStyle(EchoesPalette.parchment.opacity(0.68))
                                if let latest = conversation.searches.last {
                                    Text(latest.prompt)
                                        .font(.footnote)
                                        .foregroundStyle(EchoesPalette.parchment.opacity(0.78))
                                        .lineLimit(2)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .buttonStyle(.plain)

                        HStack {
                            Button {
                                renameDraft = conversation.title
                                renameTarget = conversation
                            } label: {
                                Label("Rename", systemImage: "pencil")
                            }
                            .buttonStyle(.bordered)

                            Button(role: .destructive) {
                                store.deleteConversation(conversation.id)
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                            .buttonStyle(.bordered)

                            Spacer()

                            Button {
                                store.selectConversation(conversation.id)
                                store.selectedSection = .discover
                            } label: {
                                Label("Open", systemImage: "arrow.right")
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(EchoesPalette.sunset)
                        }
                    }
                    .padding(18)
                    .background(GlassPanel(cornerRadius: 28))
                }
            }
        }
    }

    private var plays: some View {
        VStack(spacing: 12) {
            if store.listenHistory.isEmpty {
                EmptyPane(title: "No playback yet", bodyText: "Use song previews from a result and Echoes will keep a local listening trail.")
            } else {
                HStack {
                    Spacer()
                    Button(role: .destructive) {
                        store.clearListenHistory()
                    } label: {
                        Label("Clear Plays", systemImage: "trash")
                    }
                    .buttonStyle(.bordered)
                }

                ForEach(store.listenHistory) { entry in
                    HStack(spacing: 14) {
                        AsyncImage(url: entry.song.artworkURL) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            Rectangle().fill(.white.opacity(0.08))
                        }
                        .frame(width: 68, height: 68)
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

                        VStack(alignment: .leading, spacing: 6) {
                            Text(entry.song.title)
                                .font(.headline)
                                .foregroundStyle(.white)
                            Text(entry.prompt)
                                .font(.footnote)
                                .foregroundStyle(EchoesPalette.parchment.opacity(0.78))
                                .lineLimit(2)
                            Text(entry.listenedAt.formatted(date: .abbreviated, time: .shortened))
                                .font(.caption)
                                .foregroundStyle(EchoesPalette.parchment.opacity(0.64))
                        }

                        Spacer()

                        if entry.song.previewURLValue != nil || (previewPlayer.appleIsAuthorized && previewPlayer.appleCanPlayCatalog && entry.song.appleMusicID != nil) {
                            Button {
                                previewPlayer.toggle(
                                    song: entry.song,
                                    queue: [entry.song],
                                    context: PlaybackQueueContext(
                                        prompt: entry.prompt,
                                        conversationID: entry.conversationID,
                                        searchID: entry.searchID
                                    )
                                )
                            } label: {
                                Image(systemName: previewPlayer.isPlaying(song: entry.song) ? "pause.fill" : "play.fill")
                                    .frame(width: 36, height: 36)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(EchoesPalette.sunset)
                        }
                    }
                    .padding(16)
                    .background(GlassPanel(cornerRadius: 24))
                }
            }
        }
    }
}

struct ProfileScreen: View {
    @EnvironmentObject private var store: EchoesStore
    @EnvironmentObject private var previewPlayer: PreviewPlayerStore
    @Environment(\.openURL) private var openURL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                HeaderBlock(
                    eyebrow: "Identity",
                    title: "Profile",
                    subtitle: "Account, tokens and listening preferences, kept consistent with the web product."
                )

                accountCard
                streamingCard
                preferencesCard
            }
            .padding(24)
        }
        .background(EchoesPalette.appBackground)
        .overlay(alignment: .center) {
            if store.isAuthenticating {
                ProgressView("Completing sign in…")
                    .padding(20)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            }
        }
    }

    private var accountCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top, spacing: 16) {
                avatarView

                VStack(alignment: .leading, spacing: 6) {
                    Text(store.profile?.displayName ?? store.session?.user.displayName ?? "Guest listener")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.white)
                    Text(store.profile?.email ?? store.session?.user.email ?? "Sign in to sync tokens, plan and preferences.")
                        .foregroundStyle(EchoesPalette.parchment.opacity(0.76))

                    FlowLayout(spacing: 10) {
                        if let balance = store.tokenBalance?.balance {
                            StatPill(title: "\(balance)", subtitle: "Tokens", accent: EchoesPalette.sunset)
                                .frame(width: 110)
                        }
                        StatPill(title: store.subscription?.plan.capitalized ?? "Guest", subtitle: "Plan", accent: EchoesPalette.rose)
                            .frame(width: 110)
                        if let referral = store.profile?.referralCode {
                            StatPill(title: referral, subtitle: "Referral", accent: EchoesPalette.mist)
                                .frame(width: 130)
                        }
                    }
                }
                Spacer()
            }

            HStack(spacing: 12) {
                if store.isSignedIn {
                    Button {
                        Task { await store.refreshProfileData() }
                    } label: {
                        Label("Refresh", systemImage: "arrow.clockwise")
                    }
                    .buttonStyle(.bordered)

                    Button(role: .destructive) {
                        Task { await store.signOut() }
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                    .buttonStyle(.bordered)
                } else {
                    Button {
                        store.presentAuth(reason: "Continue with Google to connect Echoes to the same backend account used on the web.")
                    } label: {
                        Label("Open Login Page", systemImage: "person.badge.key")
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(EchoesPalette.sunset)
                }
            }
        }
        .padding(24)
        .background(HeroPanel())
    }

    private var streamingCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Streaming Services")
                .font(.title3.weight(.semibold))
                .foregroundStyle(.white)

            providerRow(
                title: "Spotify",
                subtitle: previewPlayer.spotifyIsConnected
                    ? "\(previewPlayer.spotifyDisplayName ?? "Connected")\(previewPlayer.spotifyIsPremium ? " • Premium" : "")"
                    : "Connect Spotify to save tracks and sync the Echoes playlist."
            ) {
                if previewPlayer.spotifyIsConnected {
                    Button(role: .destructive) {
                        Task { await previewPlayer.disconnectSpotify() }
                    } label: {
                        Label("Disconnect", systemImage: "xmark")
                    }
                    .buttonStyle(.bordered)
                } else {
                    Button {
                        Task {
                            if let url = await previewPlayer.beginSpotifyConnection(
                                session: store.session,
                                anonymousSessionID: store.anonymousSessionID
                            ) {
                                openURL(url)
                            }
                        }
                    } label: {
                        Label("Connect", systemImage: "arrow.up.right.square")
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(EchoesPalette.sunset)
                    .disabled(!store.isSignedIn || previewPlayer.isSpotifyConnecting)
                }
            }

            providerRow(
                title: "Apple Music",
                subtitle: appleMusicSubtitle
            ) {
                if previewPlayer.appleIsAuthorized {
                    Button {
                        Task { await previewPlayer.refreshAppleMusicStatus() }
                    } label: {
                        Label("Refresh", systemImage: "arrow.clockwise")
                    }
                    .buttonStyle(.bordered)
                } else {
                    Button {
                        Task { await previewPlayer.authorizeAppleMusic() }
                    } label: {
                        Label("Authorize", systemImage: "music.note")
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(EchoesPalette.rose)
                }
            }

            Toggle(isOn: Binding(
                get: { store.userSettings.syncFavoritesEchoesPlaylist },
                set: { enabled in
                    Task { await store.updateSyncFavoritesEchoesPlaylist(enabled) }
                }
            )) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Sync favorites to the Echoes playlist")
                        .foregroundStyle(.white)
                    Text("Spotify sync works across the app. Apple Music playlist sync is native on iPhone and iPad.")
                        .font(.footnote)
                        .foregroundStyle(EchoesPalette.parchment.opacity(0.7))
                }
            }
            .toggleStyle(.switch)
        }
        .padding(24)
        .background(GlassPanel(cornerRadius: 28))
    }

    private var preferencesCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Preferences")
                .font(.title3.weight(.semibold))
                .foregroundStyle(.white)

            preferenceRow("Theme") {
                Picker("Theme", selection: Binding(
                    get: { store.userSettings.themePreference },
                    set: { selection in
                        Task { await store.updateTheme(selection) }
                    }
                )) {
                    ForEach(EchoesTheme.allCases) { theme in
                        Text(theme.title).tag(theme)
                    }
                }
                .pickerStyle(.segmented)
            }

            preferenceRow("Description language") {
                Picker("Description language", selection: Binding(
                    get: { store.userSettings.descriptionPreference },
                    set: { selection in
                        Task { await store.updateDescriptionLanguage(selection) }
                    }
                )) {
                    ForEach(DescriptionLanguage.allCases) { language in
                        Text(language.title).tag(language)
                    }
                }
            }

            Toggle(isOn: Binding(
                get: { store.userSettings.allowAnonymizedImprovementData },
                set: { value in
                    Task { await store.updateAllowAnonymizedData(value) }
                }
            )) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Allow anonymized improvement data")
                        .foregroundStyle(.white)
                    Text("Matches the same backend preference used by the web app.")
                        .font(.footnote)
                        .foregroundStyle(EchoesPalette.parchment.opacity(0.7))
                }
            }
            .toggleStyle(.switch)
        }
        .padding(24)
        .background(GlassPanel(cornerRadius: 28))
    }

    @ViewBuilder
    private func preferenceRow<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
            content()
        }
    }

    @ViewBuilder
    private func providerRow<Actions: View>(title: String, subtitle: String, @ViewBuilder actions: () -> Actions) -> some View {
        HStack(alignment: .center, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(.white)
                Text(subtitle)
                    .font(.footnote)
                    .foregroundStyle(EchoesPalette.parchment.opacity(0.74))
            }
            Spacer()
            actions()
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(.white.opacity(0.05))
        )
    }

    private var appleMusicSubtitle: String {
        if previewPlayer.isAppleMusicLoading {
            return "Checking Apple Music availability…"
        }
        if previewPlayer.appleIsAuthorized {
            if previewPlayer.appleCanPlayCatalog {
                return previewPlayer.appleHasCloudLibrary
                    ? "Authorized and ready for full catalog playback."
                    : "Authorized for playback. Cloud library is currently unavailable."
            }
            return "Authorized, but this account cannot currently play catalog content."
        }
        switch previewPlayer.appleAuthorizationStatus {
        case .denied:
            return "Permission denied. Re-enable Apple Music access from system settings."
        case .restricted:
            return "Apple Music access is restricted on this device."
        case .notDetermined:
            return "Authorize Apple Music for full in-app playback."
        case .authorized:
            return "Apple Music is available."
        @unknown default:
            return "Apple Music availability is unknown."
        }
    }

    private var avatarView: some View {
        Group {
            if let urlString = store.profile?.avatarURL ?? store.session?.user.avatarURL?.absoluteString,
               let url = URL(string: urlString) {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Circle().fill(.white.opacity(0.08))
                }
            } else {
                Circle()
                    .fill(EchoesPalette.sunset.opacity(0.24))
                    .overlay {
                        Image(systemName: "person.fill")
                            .foregroundStyle(.white)
                    }
            }
        }
        .frame(width: 72, height: 72)
        .clipShape(Circle())
    }
}

struct CompactPlayerBar: View {
    @EnvironmentObject private var previewPlayer: PreviewPlayerStore

    var body: some View {
        if let song = previewPlayer.currentSong {
            VStack(spacing: 10) {
                Slider(
                    value: Binding(
                        get: { min(previewPlayer.currentTime, max(previewPlayer.duration, 0)) },
                        set: { previewPlayer.seek(to: $0) }
                    ),
                    in: 0...max(previewPlayer.duration, 1)
                )
                .tint(EchoesPalette.sunset)
                .disabled(previewPlayer.duration <= 0)

                HStack(spacing: 14) {
                    AsyncImage(url: song.artworkURL) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Rectangle().fill(.white.opacity(0.08))
                    }
                    .frame(width: 54, height: 54)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                    VStack(alignment: .leading, spacing: 4) {
                        Text(song.title)
                            .font(.headline)
                            .foregroundStyle(.white)
                            .lineLimit(1)
                        Text("\(song.artist) • \(activeProviderLabel)")
                            .font(.footnote)
                            .foregroundStyle(EchoesPalette.parchment.opacity(0.72))
                            .lineLimit(1)
                    }

                    Spacer()

                    Text("\(formatTime(previewPlayer.currentTime)) / \(formatTime(previewPlayer.duration))")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(EchoesPalette.parchment.opacity(0.66))

                    Button {
                        Task { await previewPlayer.previous() }
                    } label: {
                        Image(systemName: "backward.fill")
                    }
                    .buttonStyle(.bordered)
                    .disabled(!previewPlayer.canGoPrevious)

                    Button {
                        Task { await previewPlayer.toggleCurrentPlayback() }
                    } label: {
                        Image(systemName: previewPlayer.isPlaying ? "pause.fill" : "play.fill")
                            .frame(width: 18, height: 18)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(EchoesPalette.sunset)

                    Button {
                        Task { await previewPlayer.next() }
                    } label: {
                        Image(systemName: "forward.fill")
                    }
                    .buttonStyle(.bordered)
                    .disabled(!previewPlayer.canGoNext)
                }
            }
            .padding(16)
            .background(GlassPanel(cornerRadius: 26))
        }
    }

    private var activeProviderLabel: String {
        switch previewPlayer.engine {
        case .appleMusic:
            "Apple Music"
        case .preview:
            "Preview"
        case .idle:
            songProviderFallback
        }
    }

    private var songProviderFallback: String {
        previewPlayer.currentSong?.providerLabel ?? "Echoes"
    }

    private func formatTime(_ value: TimeInterval) -> String {
        guard value.isFinite, value >= 0 else { return "0:00" }
        let minutes = Int(value) / 60
        let seconds = Int(value) % 60
        return "\(minutes):" + String(format: "%02d", seconds)
    }
}

struct AuthScreen: View {
    @EnvironmentObject private var store: EchoesStore
    @StateObject private var authSession = NativeOAuthSession()

    private let highlights = [
        ("Same backend", "Your profile, tokens and preferences are shared with the web app."),
        ("Multiple chats", "Keep more than one thread and move between devices without losing context."),
        ("Cleaner flow", "A dedicated login page instead of a hidden button in profile."),
    ]

    var body: some View {
        ZStack {
            EchoesPalette.appBackground
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    HStack {
                        Spacer()
                        Button("Continue as guest") {
                            store.dismissAuth()
                        }
                        .buttonStyle(.bordered)
                    }

                    VStack(alignment: .leading, spacing: 16) {
                        Text("Echoes")
                            .font(.system(size: 48, weight: .semibold, design: .serif))
                            .foregroundStyle(.white)
                        Text("Sign in to turn the native app into a real extension of the web product, not an isolated shell.")
                            .font(.title3)
                            .foregroundStyle(EchoesPalette.parchment.opacity(0.82))
                        if let prompt = store.authPrompt, !prompt.isEmpty {
                            Text(prompt)
                                .font(.headline)
                                .foregroundStyle(EchoesPalette.sunset)
                                .padding(16)
                                .background(
                                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                                        .fill(.white.opacity(0.05))
                                )
                        }
                    }
                    .padding(28)
                    .background(HeroPanel())

                    VStack(spacing: 14) {
                        ForEach(highlights, id: \.0) { item in
                            HStack(alignment: .top, spacing: 14) {
                                Image(systemName: "sparkles")
                                    .font(.headline)
                                    .foregroundStyle(EchoesPalette.sunset)
                                    .padding(.top, 2)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(item.0)
                                        .font(.headline)
                                        .foregroundStyle(.white)
                                    Text(item.1)
                                        .font(.footnote)
                                        .foregroundStyle(EchoesPalette.parchment.opacity(0.74))
                                }
                                Spacer()
                            }
                            .padding(18)
                            .background(GlassPanel(cornerRadius: 24))
                        }
                    }

                    VStack(alignment: .leading, spacing: 16) {
                        Text("Login")
                            .font(.title2.weight(.semibold))
                            .foregroundStyle(.white)

                        Button {
                            authSession.start(
                                url: store.beginGoogleSignIn(),
                                callbackScheme: EchoesConfig.shared.redirectScheme,
                                onCallback: { callbackURL in
                                    Task {
                                        await store.handleIncomingURL(callbackURL)
                                    }
                                },
                                onError: { message in
                                    store.globalError = message
                                    store.isAuthenticating = false
                                }
                            )
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: "globe")
                                    .font(.headline)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Continue with Google")
                                        .font(.headline)
                                    Text("Uses the same Supabase authentication backend as the web app.")
                                        .font(.footnote)
                                        .foregroundStyle(.white.opacity(0.82))
                                }
                                Spacer()
                            }
                            .foregroundStyle(.white)
                            .padding(18)
                        }
                        .buttonStyle(.plain)
                        .background(
                            RoundedRectangle(cornerRadius: 24, style: .continuous)
                                .fill(
                                    LinearGradient(
                                        colors: [EchoesPalette.sunset.opacity(0.9), EchoesPalette.ember.opacity(0.82)],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                        )
                    }
                }
                .padding(24)
                .frame(maxWidth: 760)
                .frame(maxWidth: .infinity)
            }
        }
    }
}

final class NativeOAuthSession: NSObject, ObservableObject, ASWebAuthenticationPresentationContextProviding {
    private var session: ASWebAuthenticationSession?

    func start(
        url: URL,
        callbackScheme: String,
        onCallback: @escaping (URL) -> Void,
        onError: @escaping (String) -> Void
    ) {
        session?.cancel()

        let session = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme) { callbackURL, error in
            defer { self.session = nil }

            if let callbackURL {
                onCallback(callbackURL)
                return
            }

            if let error as? ASWebAuthenticationSessionError,
               error.code == .canceledLogin {
                onError("Google sign-in was cancelled.")
                return
            }

            onError(error?.localizedDescription ?? "Google sign-in failed.")
        }

        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = false
        self.session = session

        if !session.start() {
            self.session = nil
            onError("Unable to start Google sign-in.")
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
#if canImport(UIKit)
        return UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \.isKeyWindow) ?? ASPresentationAnchor()
#elseif canImport(AppKit)
        return NSApplication.shared.keyWindow ?? ASPresentationAnchor()
#else
        return ASPresentationAnchor()
#endif
    }
}

struct HeaderBlock: View {
    let eyebrow: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(eyebrow.uppercased())
                .font(.caption.weight(.bold))
                .foregroundStyle(EchoesPalette.sunset)
            Text(title)
                .font(.system(size: 36, weight: .semibold, design: .serif))
                .foregroundStyle(.white)
            Text(subtitle)
                .foregroundStyle(EchoesPalette.parchment.opacity(0.78))
        }
    }
}

struct RenameConversationSheet: View {
    @Binding var title: String
    let onSave: () -> Void
    let onCancel: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Rename conversation")
                .font(.title3.weight(.semibold))

            TextField("Title", text: $title)
                .textFieldStyle(.roundedBorder)

            HStack {
                Button("Cancel", role: .cancel) {
                    onCancel()
                }
                Spacer()
                Button("Save") {
                    onSave()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(24)
    }
}

struct EmptyPane: View {
    let title: String
    let bodyText: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .foregroundStyle(.white)
            Text(bodyText)
                .foregroundStyle(EchoesPalette.parchment.opacity(0.76))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(GlassPanel(cornerRadius: 26))
    }
}

struct TagChip: View {
    let text: String
    let fill: Color
    let foreground: Color

    var body: some View {
        Text(text)
            .font(.caption.weight(.medium))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(fill, in: Capsule())
            .foregroundStyle(foreground)
    }
}

struct StatPill: View {
    let title: String
    let subtitle: String
    let accent: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(subtitle.uppercased())
                .font(.caption2.weight(.bold))
                .foregroundStyle(EchoesPalette.parchment.opacity(0.64))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(accent.opacity(0.16))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .strokeBorder(accent.opacity(0.22))
                )
        )
    }
}

struct HeroPanel: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 32, style: .continuous)
            .fill(
                LinearGradient(
                    colors: [
                        EchoesPalette.sunset.opacity(0.22),
                        EchoesPalette.rose.opacity(0.14),
                        .white.opacity(0.04)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 32, style: .continuous)
                    .strokeBorder(.white.opacity(0.09))
            )
            .overlay(alignment: .topTrailing) {
                Circle()
                    .fill(EchoesPalette.sunset.opacity(0.2))
                    .frame(width: 180, height: 180)
                    .blur(radius: 16)
                    .offset(x: 26, y: -26)
            }
    }
}

struct GlassPanel: View {
    let cornerRadius: CGFloat

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(.ultraThinMaterial.opacity(0.34))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(.white.opacity(0.08))
            )
    }
}

struct FlowLayout: Layout {
    let spacing: CGFloat

    init(spacing: CGFloat = 8) {
        self.spacing = spacing
    }

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }

        return CGSize(width: maxWidth, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var point = bounds.origin
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if point.x + size.width > bounds.maxX, point.x > bounds.minX {
                point.x = bounds.minX
                point.y += rowHeight + spacing
                rowHeight = 0
            }

            subview.place(
                at: point,
                proposal: ProposedViewSize(width: size.width, height: size.height)
            )

            point.x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
