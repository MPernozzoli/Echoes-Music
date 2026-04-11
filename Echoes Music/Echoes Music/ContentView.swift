//
//  ContentView.swift
//  Echoes Music
//
//  Created by Massimo Pernozzoli on 09/04/2026.
//

import SwiftUI
import MusicKit

struct ContentView: View {
    @EnvironmentObject private var store: EchoesStore
    @EnvironmentObject private var previewPlayer: PreviewPlayerStore
    @State private var showingError = false

    var body: some View {
        EchoesRootView()
            .task {
                await store.bootstrap()
                previewPlayer.onPlaybackStarted = { item in
                    guard let context = item.context else { return }
                    store.recordListen(
                        song: item.song,
                        prompt: context.prompt,
                        conversationID: context.conversationID,
                        searchID: context.searchID
                    )
                }
                await previewPlayer.bootstrap(session: store.session, anonymousSessionID: store.anonymousSessionID)
            }
            .task(id: store.session?.accessToken ?? "guest-\(store.anonymousSessionID)") {
                await previewPlayer.bootstrap(session: store.session, anonymousSessionID: store.anonymousSessionID)
                previewPlayer.scheduleFavoritesSync(
                    favorites: store.favorites,
                    enabled: store.userSettings.syncFavoritesEchoesPlaylist
                )
            }
            .preferredColorScheme(store.preferredColorScheme)
            .tint(EchoesPalette.sunset)
            .background(EchoesPalette.appBackground.ignoresSafeArea())
            .onOpenURL { url in
                Task {
                    let handledByPlayer = await previewPlayer.handleIncomingURL(
                        url,
                        session: store.session,
                        anonymousSessionID: store.anonymousSessionID
                    )
                    if !handledByPlayer {
                        await store.handleIncomingURL(url)
                    }
                    await previewPlayer.bootstrap(session: store.session, anonymousSessionID: store.anonymousSessionID)
                }
            }
            .onChange(of: store.globalError) { _, newValue in
                showingError = newValue != nil
            }
            .onChange(of: previewPlayer.lastError) { _, newValue in
                showingError = newValue != nil || store.globalError != nil
            }
            .onChange(of: store.favorites) { _, newValue in
                previewPlayer.scheduleFavoritesSync(
                    favorites: newValue,
                    enabled: store.userSettings.syncFavoritesEchoesPlaylist
                )
            }
            .onChange(of: store.userSettings.syncFavoritesEchoesPlaylist) { _, newValue in
                previewPlayer.scheduleFavoritesSync(
                    favorites: store.favorites,
                    enabled: newValue
                )
            }
            .onChange(of: previewPlayer.spotifyConnection?.spotifyUserID) { _, _ in
                previewPlayer.scheduleFavoritesSync(
                    favorites: store.favorites,
                    enabled: store.userSettings.syncFavoritesEchoesPlaylist
                )
            }
            .onChange(of: previewPlayer.appleAuthorizationStatus.rawValue) { _, _ in
                previewPlayer.scheduleFavoritesSync(
                    favorites: store.favorites,
                    enabled: store.userSettings.syncFavoritesEchoesPlaylist
                )
            }
            .alert("Echoes", isPresented: $showingError, actions: {
                Button("OK") {
                    store.globalError = nil
                    previewPlayer.lastError = nil
                }
            }, message: {
                Text(store.globalError ?? previewPlayer.lastError ?? "")
            })
            .safeAreaInset(edge: .bottom) {
                if previewPlayer.hasActivePlayer {
                    CompactPlayerBar()
                        .environmentObject(previewPlayer)
                        .padding(.horizontal, 14)
                        .padding(.bottom, 8)
                }
            }
#if os(macOS)
            .sheet(isPresented: $store.isAuthScreenPresented) {
                AuthScreen()
                    .environmentObject(store)
                    .frame(minWidth: 620, minHeight: 760)
            }
#else
            .fullScreenCover(isPresented: $store.isAuthScreenPresented) {
                AuthScreen()
                    .environmentObject(store)
            }
#endif
    }
}

#Preview {
    ContentView()
        .environmentObject(EchoesStore(service: SupabaseService(), preview: true))
        .environmentObject(PreviewPlayerStore())
}
