//
//  Echoes_MusicApp.swift
//  Echoes Music
//
//  Created by Massimo Pernozzoli on 09/04/2026.
//

import SwiftUI

@main
struct Echoes_MusicApp: App {
    @StateObject private var store: EchoesStore
    @StateObject private var previewPlayer: PreviewPlayerStore

    init() {
        _store = StateObject(wrappedValue: EchoesStore(service: SupabaseService(), preview: false))
        _previewPlayer = StateObject(wrappedValue: PreviewPlayerStore())
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .environmentObject(previewPlayer)
        }
    }
}
