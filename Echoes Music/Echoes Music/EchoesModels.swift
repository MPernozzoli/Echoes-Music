//
//  EchoesModels.swift
//  Echoes Music
//

import Foundation
import SwiftUI

enum AppSection: String, CaseIterable, Hashable {
    case discover
    case favorites
    case history
    case profile

    var title: String {
        switch self {
        case .discover: "Discover"
        case .favorites: "Favorites"
        case .history: "History"
        case .profile: "Profile"
        }
    }

    var systemImage: String {
        switch self {
        case .discover: "sparkles.rectangle.stack"
        case .favorites: "heart"
        case .history: "clock.arrow.trianglehead.counterclockwise.rotate.90"
        case .profile: "person.crop.circle"
        }
    }
}

enum EchoesTheme: String, CaseIterable, Codable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: "System"
        case .light: "Light"
        case .dark: "Dark"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}

enum DescriptionLanguage: String, CaseIterable, Codable, Identifiable {
    case auto
    case it
    case en
    case es
    case fr
    case de
    case pt

    var id: String { rawValue }

    var title: String {
        switch self {
        case .auto: "Automatic"
        case .it: "Italiano"
        case .en: "English"
        case .es: "Español"
        case .fr: "Français"
        case .de: "Deutsch"
        case .pt: "Português"
        }
    }
}

enum MusicSearchMode: String, Codable {
    case search
    case lucky
    case memoryCompact = "memory_compact"
}

enum SongProvider: String, Codable {
    case spotify
    case appleMusic = "apple_music"
    case mock
}

struct SupabaseSession: Codable {
    let accessToken: String
    let refreshToken: String
    let tokenType: String
    let expiresIn: Int?
    let expiresAt: Int?
    let user: SupabaseUser

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
        case expiresAt = "expires_at"
        case user
    }

    var expirationDate: Date? {
        guard let expiresAt else { return nil }
        return Date(timeIntervalSince1970: TimeInterval(expiresAt))
    }

    var isNearExpiry: Bool {
        guard let expirationDate else { return false }
        return expirationDate.timeIntervalSinceNow < 180
    }
}

struct SupabaseUser: Codable {
    let id: String
    let email: String?
    let appMetadata: AppMetadata?
    let userMetadata: UserMetadata?

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case appMetadata = "app_metadata"
        case userMetadata = "user_metadata"
    }

    struct AppMetadata: Codable {
        let provider: String?
        let providers: [String]?
    }

    struct UserMetadata: Codable {
        let fullName: String?
        let name: String?
        let picture: String?
        let avatarURL: String?
        let email: String?

        enum CodingKeys: String, CodingKey {
            case fullName = "full_name"
            case name
            case picture
            case avatarURL = "avatar_url"
            case email
        }
    }

    var displayName: String {
        userMetadata?.fullName ??
        userMetadata?.name ??
        email ??
        "Echoes Listener"
    }

    var avatarURL: URL? {
        if let url = userMetadata?.avatarURL, let resolved = URL(string: url) {
            return resolved
        }
        if let url = userMetadata?.picture, let resolved = URL(string: url) {
            return resolved
        }
        return nil
    }
}

struct UserProfileRecord: Codable {
    let id: String
    let displayName: String?
    let avatarURL: String?
    let email: String?
    let referralCode: String?

    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case avatarURL = "avatar_url"
        case email
        case referralCode = "referral_code"
    }
}

struct UserTokensRecord: Codable {
    let balance: Int
    let lifetimeEarned: Int
    let lifetimeSpent: Int

    enum CodingKeys: String, CodingKey {
        case balance
        case lifetimeEarned = "lifetime_earned"
        case lifetimeSpent = "lifetime_spent"
    }
}

struct SubscriptionRecord: Codable {
    let plan: String
    let status: String
    let currentPeriodEnd: Date?

    enum CodingKeys: String, CodingKey {
        case plan
        case status
        case currentPeriodEnd = "current_period_end"
    }
}

struct UserSettingsRecord: Codable {
    let id: String
    let userID: String?
    let anonymousSessionID: String?
    let allowAnonymizedImprovementData: Bool
    let descriptionLanguage: String?
    let syncFavoritesEchoesPlaylist: Bool
    let theme: String?
    let uiLanguage: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case anonymousSessionID = "anonymous_session_id"
        case allowAnonymizedImprovementData = "allow_anonymized_improvement_data"
        case descriptionLanguage = "description_language"
        case syncFavoritesEchoesPlaylist = "sync_favorites_echoes_playlist"
        case theme
        case uiLanguage = "ui_language"
    }

    static let fallback = UserSettingsRecord(
        id: "local-settings",
        userID: nil,
        anonymousSessionID: nil,
        allowAnonymizedImprovementData: true,
        descriptionLanguage: DescriptionLanguage.auto.rawValue,
        syncFavoritesEchoesPlaylist: false,
        theme: EchoesTheme.system.rawValue,
        uiLanguage: Locale.current.language.languageCode?.identifier
    )

    var themePreference: EchoesTheme {
        EchoesTheme(rawValue: theme ?? EchoesTheme.system.rawValue) ?? .system
    }

    var descriptionPreference: DescriptionLanguage {
        DescriptionLanguage(rawValue: descriptionLanguage ?? DescriptionLanguage.auto.rawValue) ?? .auto
    }
}

struct UserSettingsPatch: Encodable {
    var userID: String?
    var anonymousSessionID: String?
    var allowAnonymizedImprovementData: Bool?
    var descriptionLanguage: String?
    var syncFavoritesEchoesPlaylist: Bool?
    var theme: String?
    var uiLanguage: String?

    enum CodingKeys: String, CodingKey {
        case userID = "user_id"
        case anonymousSessionID = "anonymous_session_id"
        case allowAnonymizedImprovementData = "allow_anonymized_improvement_data"
        case descriptionLanguage = "description_language"
        case syncFavoritesEchoesPlaylist = "sync_favorites_echoes_playlist"
        case theme
        case uiLanguage = "ui_language"
    }
}

struct SpotifyConnectionRecord: Codable, Hashable {
    let spotifyUserID: String
    let displayName: String?
    let product: String?

    enum CodingKeys: String, CodingKey {
        case spotifyUserID = "spotify_user_id"
        case displayName = "display_name"
        case product
    }

    var isPremium: Bool {
        product?.lowercased() == "premium"
    }
}

struct SpotifyPlaybackToken: Codable, Hashable {
    let accessToken: String
    let product: String?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case product
    }
}

struct StreamingPlaylist: Codable, Hashable, Identifiable {
    let id: String
    let name: String
}

struct EmotionalProfile: Codable, Hashable {
    let themes: [String]
    let mood: String
    let energy: String
    let intimacy: String
    let catharsis: String
    let emotionalTension: String

    enum CodingKeys: String, CodingKey {
        case themes
        case mood
        case energy
        case intimacy
        case catharsis
        case emotionalTension = "emotionalTension"
    }
}

struct StandardAxes: Codable, Hashable {
    let moodLabel: String
    let energy: String
    let intimacy: Int
    let catharsis: String
    let emotionalTension: String
    let dominantThemes: [String]

    static let empty = StandardAxes(
        moodLabel: "",
        energy: "medium",
        intimacy: 3,
        catharsis: "medium",
        emotionalTension: "medium",
        dominantThemes: []
    )
}

struct ConversationMemory: Codable, Hashable {
    let threadSummary: String
    let standardAxes: StandardAxes
}

struct UserTasteProfile: Codable, Hashable {
    var globalSummary: String
    var userStandardAxes: StandardAxes
    var genreAffinityTags: [String]
    var preferredLanguages: [String]

    static let empty = UserTasteProfile(
        globalSummary: "",
        userStandardAxes: .empty,
        genreAffinityTags: [],
        preferredLanguages: []
    )
}

struct UserTasteProfileUpdate: Codable {
    let globalSummary: String?
    let userStandardAxes: StandardAxes?
    let genreAffinityTags: [String]?
    let preferredLanguages: [String]?
}

struct Song: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let artist: String
    let album: String
    let releaseYear: Int?
    let artwork: String
    let emotionalTags: [String]
    let explanation: String
    let relevanceScore: Int
    let provider: SongProvider?
    let spotifyURI: String?
    let appleMusicID: String?
    let previewURL: String?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case artist
        case album
        case releaseYear = "releaseYear"
        case artwork
        case emotionalTags
        case explanation
        case relevanceScore
        case provider
        case spotifyURI = "spotifyUri"
        case appleMusicID = "appleMusicId"
        case previewURL = "previewUrl"
    }

    var artworkURL: URL? { URL(string: artwork) }
    var previewURLValue: URL? { previewURL.flatMap(URL.init(string:)) }

    var providerLabel: String {
        switch provider {
        case .spotify: "Spotify"
        case .appleMusic: "Apple Music"
        case .mock, .none: "Echoes"
        }
    }

    var deepLinkURL: URL? {
        if let spotifyURI {
            let trackID = spotifyURI.replacingOccurrences(of: "spotify:track:", with: "")
            if !trackID.isEmpty {
                return URL(string: "https://open.spotify.com/track/\(trackID)")
            }
        }

        if let appleMusicID {
            let term = "\(title) \(artist)".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? appleMusicID
            return URL(string: "https://music.apple.com/us/search?term=\(term)")
        }

        return nil
    }
}

struct MusicSearchRequest: Encodable {
    let conversationID: String
    let prompt: String?
    let descriptionLanguage: String?
    let mode: MusicSearchMode?
    let conversationMemory: ConversationMemory?
    let userTasteProfile: UserTasteProfile?
    let anonymousSessionID: String?

    enum CodingKeys: String, CodingKey {
        case conversationID = "conversationId"
        case prompt
        case descriptionLanguage
        case mode
        case conversationMemory
        case userTasteProfile
        case anonymousSessionID = "anonymousSessionId"
    }
}

struct MusicSearchResponse: Codable {
    let emotionalProfile: EmotionalProfile?
    let songs: [Song]?
    let narrativeReply: String?
    let adjacentInterpretations: [String]
    let conversationMemoryUpdate: ConversationMemory?
    let userTasteProfileUpdate: UserTasteProfileUpdate?
    let error: String?
    let code: String?

    enum CodingKeys: String, CodingKey {
        case emotionalProfile
        case songs
        case narrativeReply
        case adjacentInterpretations
        case conversationMemoryUpdate
        case userTasteProfileUpdate
        case error
        case code
    }
}

struct SearchRecord: Codable, Identifiable, Hashable {
    let id: String
    let prompt: String
    let timestamp: Date
    let emotionalProfile: EmotionalProfile
    let songs: [Song]
    let adjacentInterpretations: [String]
    let narrativeReply: String
}

struct ConversationThread: Codable, Identifiable, Hashable {
    let id: String
    var title: String
    var updatedAt: Date
    var searches: [SearchRecord]
    var conversationMemory: ConversationMemory?

    static func blank(id: String = UUID().uuidString) -> ConversationThread {
        ConversationThread(
            id: id,
            title: "New conversation",
            updatedAt: Date(),
            searches: [],
            conversationMemory: nil
        )
    }
}

struct ListenEntry: Codable, Identifiable, Hashable {
    let id: String
    let listenedAt: Date
    let conversationID: String
    let searchID: String
    let prompt: String
    let song: Song
}

enum HistoryTab: String, CaseIterable, Identifiable {
    case chats
    case plays

    var id: String { rawValue }
}

enum EchoesPalette {
    static let charcoal = Color(red: 0.06, green: 0.06, blue: 0.08)
    static let warmBlack = Color(red: 0.12, green: 0.10, blue: 0.08)
    static let parchment = Color(red: 0.96, green: 0.94, blue: 0.91)
    static let mutedSand = Color(red: 0.77, green: 0.71, blue: 0.64)
    static let sunset = Color(red: 0.91, green: 0.57, blue: 0.18)
    static let ember = Color(red: 0.81, green: 0.38, blue: 0.17)
    static let rose = Color(red: 0.63, green: 0.35, blue: 0.34)
    static let mist = Color(red: 0.61, green: 0.60, blue: 0.67)

    static var appBackground: some View {
        ZStack {
            LinearGradient(
                colors: [Color.black, warmBlack, charcoal],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            RadialGradient(
                colors: [sunset.opacity(0.24), .clear],
                center: .topTrailing,
                startRadius: 10,
                endRadius: 420
            )

            RadialGradient(
                colors: [rose.opacity(0.16), .clear],
                center: .bottomLeading,
                startRadius: 20,
                endRadius: 360
            )
        }
    }
}
