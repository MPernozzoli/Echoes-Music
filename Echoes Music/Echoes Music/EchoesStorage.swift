//
//  EchoesStorage.swift
//  Echoes Music
//

import Foundation

enum EchoesStorageKeys {
    static let session = "echoes.session"
    static let favorites = "echoes.favorites"
    static let conversations = "echoes.conversations"
    static let listens = "echoes.listens"
    static let tasteProfile = "echoes.taste-profile"
    static let settings = "echoes.settings"
    static let activeConversationID = "echoes.active-conversation-id"
    static let anonymousSessionID = "echoes.anonymous-session-id"
    static let pkceVerifier = "echoes.pkce.verifier"
}

enum EchoesStorage {
    static let defaults = UserDefaults.standard

    private static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    private static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    static func load<T: Decodable>(_ type: T.Type, key: String, fallback: @autoclosure () -> T) -> T {
        guard let data = defaults.data(forKey: key) else { return fallback() }
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            return fallback()
        }
    }

    static func save<T: Encodable>(_ value: T, key: String) {
        guard let data = try? encoder.encode(value) else { return }
        defaults.set(data, forKey: key)
    }

    static func remove(_ key: String) {
        defaults.removeObject(forKey: key)
    }
}
