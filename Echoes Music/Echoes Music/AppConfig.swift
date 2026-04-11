//
//  AppConfig.swift
//  Echoes Music
//

import Foundation

struct EchoesConfig {
    let supabaseURL: URL
    let projectID: String
    let anonKey: String
    let redirectScheme: String

    var redirectURL: URL {
        URL(string: "\(redirectScheme)://auth/callback")!
    }

    static let shared = EchoesConfig()

    init(bundle: Bundle = .main) {
        let urlString = bundle.requiredString(forInfoDictionaryKey: "SUPABASE_URL")
        let projectID = bundle.requiredString(forInfoDictionaryKey: "SUPABASE_PROJECT_ID")
        let anonKey = bundle.requiredString(forInfoDictionaryKey: "SUPABASE_ANON_KEY")
        let redirectScheme = bundle.requiredString(forInfoDictionaryKey: "ECHOES_REDIRECT_SCHEME")

        guard let supabaseURL = URL(string: urlString) else {
            fatalError("SUPABASE_URL is not a valid URL.")
        }

        self.supabaseURL = supabaseURL
        self.projectID = projectID
        self.anonKey = anonKey
        self.redirectScheme = redirectScheme
    }
}

private extension Bundle {
    func requiredString(forInfoDictionaryKey key: String) -> String {
        guard let value = object(forInfoDictionaryKey: key) as? String else {
            fatalError("Missing \(key) in Info.plist.")
        }

        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            fatalError("\(key) is empty in Info.plist.")
        }
        return trimmed
    }
}
