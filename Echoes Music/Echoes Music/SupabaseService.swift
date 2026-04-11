//
//  SupabaseService.swift
//  Echoes Music
//

import CryptoKit
import Foundation

enum SupabaseServiceError: LocalizedError {
    case invalidResponse
    case server(String)
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            "Invalid server response."
        case .server(let message):
            message
        case .unauthorized:
            "Your session expired. Please sign in again."
        }
    }
}

struct PKCEPayload {
    let verifier: String
    let challenge: String
    let method: String

    static func generate() -> PKCEPayload {
        let verifier = randomVerifier()
        let challenge = base64URL(Data(SHA256.hash(data: Data(verifier.utf8))))
        return PKCEPayload(verifier: verifier, challenge: challenge, method: "s256")
    }

    private static func randomVerifier() -> String {
        let length = 56
        let allowed = Array("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~")
        var verifier = ""
        verifier.reserveCapacity(length)
        for _ in 0..<length {
            verifier.append(allowed.randomElement() ?? "A")
        }
        return verifier
    }

    private static func base64URL(_ data: Data) -> String {
        data
            .base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}

final class SupabaseService {
    private let config: EchoesConfig
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init(config: EchoesConfig = .shared, session: URLSession = .shared) {
        self.config = config
        self.session = session

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        self.decoder = decoder

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        self.encoder = encoder
    }

    func makeOAuthURL(provider: String, redirectTo: URL, pkce: PKCEPayload) -> URL {
        var components = URLComponents(url: config.supabaseURL.appending(path: "/auth/v1/authorize"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "provider", value: provider),
            URLQueryItem(name: "redirect_to", value: redirectTo.absoluteString),
            URLQueryItem(name: "code_challenge", value: pkce.challenge),
            URLQueryItem(name: "code_challenge_method", value: pkce.method),
        ]
        return components.url!
    }

    func exchangeCodeForSession(code: String, verifier: String) async throws -> SupabaseSession {
        let body = try encoder.encode([
            "auth_code": code,
            "code_verifier": verifier,
        ])
        let data = try await sendAuthRequest(
            method: "POST",
            path: "/auth/v1/token?grant_type=pkce",
            body: body
        )
        return try decode(SupabaseSession.self, from: data)
    }

    func refreshSession(refreshToken: String) async throws -> SupabaseSession {
        let body = try encoder.encode([
            "refresh_token": refreshToken,
        ])
        let data = try await sendAuthRequest(
            method: "POST",
            path: "/auth/v1/token?grant_type=refresh_token",
            body: body
        )
        return try decode(SupabaseSession.self, from: data)
    }

    func revokeSession(accessToken: String) async {
        _ = try? await sendAuthRequest(
            method: "POST",
            path: "/auth/v1/logout",
            accessToken: accessToken
        )
    }

    func fetchProfile(accessToken: String, userID: String) async throws -> UserProfileRecord? {
        let rows: [UserProfileRecord] = try await fetchRows(
            table: "profiles",
            accessToken: accessToken,
            queryItems: [
                .init(name: "select", value: "id,display_name,avatar_url,email,referral_code"),
                .init(name: "id", value: "eq.\(userID)"),
                .init(name: "limit", value: "1"),
            ]
        )
        return rows.first
    }

    func fetchTokens(accessToken: String, userID: String) async throws -> UserTokensRecord? {
        let rows: [UserTokensRecord] = try await fetchRows(
            table: "user_tokens",
            accessToken: accessToken,
            queryItems: [
                .init(name: "select", value: "balance,lifetime_earned,lifetime_spent"),
                .init(name: "user_id", value: "eq.\(userID)"),
                .init(name: "limit", value: "1"),
            ]
        )
        return rows.first
    }

    func fetchSubscription(accessToken: String, userID: String) async throws -> SubscriptionRecord? {
        let rows: [SubscriptionRecord] = try await fetchRows(
            table: "user_subscriptions",
            accessToken: accessToken,
            queryItems: [
                .init(name: "select", value: "plan,status,current_period_end"),
                .init(name: "user_id", value: "eq.\(userID)"),
                .init(name: "status", value: "eq.active"),
                .init(name: "limit", value: "1"),
            ]
        )
        return rows.first
    }

    func fetchUserSettings(accessToken: String?, userID: String?, anonymousSessionID: String) async throws -> UserSettingsRecord? {
        var queryItems = [
            URLQueryItem(name: "select", value: "id,user_id,anonymous_session_id,allow_anonymized_improvement_data,description_language,sync_favorites_echoes_playlist,theme,ui_language"),
            URLQueryItem(name: "order", value: "updated_at.desc"),
            URLQueryItem(name: "limit", value: "1"),
        ]

        if let userID {
            queryItems.append(.init(name: "user_id", value: "eq.\(userID)"))
        } else {
            queryItems.append(.init(name: "anonymous_session_id", value: "eq.\(anonymousSessionID)"))
        }

        let rows: [UserSettingsRecord] = try await fetchRows(
            table: "user_settings",
            accessToken: accessToken,
            queryItems: queryItems
        )
        return rows.first
    }

    func upsertUserSettings(accessToken: String?, userID: String?, anonymousSessionID: String, patch: UserSettingsPatch) async throws -> UserSettingsRecord {
        let existing = try await fetchUserSettings(accessToken: accessToken, userID: userID, anonymousSessionID: anonymousSessionID)

        if let existing {
            let data = try encoder.encode(patch)
            let rows: [UserSettingsRecord] = try await mutateRows(
                method: "PATCH",
                table: "user_settings",
                accessToken: accessToken,
                queryItems: [URLQueryItem(name: "id", value: "eq.\(existing.id)")],
                body: data
            )
            return rows.first ?? existing
        }

        let createPatch = UserSettingsPatch(
            userID: userID,
            anonymousSessionID: anonymousSessionID,
            allowAnonymizedImprovementData: patch.allowAnonymizedImprovementData ?? true,
            descriptionLanguage: patch.descriptionLanguage,
            syncFavoritesEchoesPlaylist: patch.syncFavoritesEchoesPlaylist,
            theme: patch.theme,
            uiLanguage: patch.uiLanguage
        )
        let data = try encoder.encode(createPatch)
        let rows: [UserSettingsRecord] = try await mutateRows(
            method: "POST",
            table: "user_settings",
            accessToken: accessToken,
            body: data
        )
        guard let row = rows.first else {
            throw SupabaseServiceError.invalidResponse
        }
        return row
    }

    func linkAnonymousSettings(accessToken: String, userID: String, anonymousSessionID: String) async throws {
        let existingUserSettings = try await fetchUserSettings(
            accessToken: accessToken,
            userID: userID,
            anonymousSessionID: anonymousSessionID
        )

        guard existingUserSettings == nil else { return }

        let body = try encoder.encode([
            "user_id": userID,
        ])
        _ = try await mutateRows(
            method: "PATCH",
            table: "user_settings",
            accessToken: accessToken,
            queryItems: [
                .init(name: "anonymous_session_id", value: "eq.\(anonymousSessionID)"),
                .init(name: "user_id", value: "is.null"),
            ],
            body: body
        ) as [UserSettingsRecord]
    }

    func performSearch(request: MusicSearchRequest, accessToken: String?) async throws -> MusicSearchResponse {
        let body = try encoder.encode(request)
        let data = try await sendFunctionRequest(
            name: "music-search",
            accessToken: accessToken,
            body: body
        )
        return try decode(MusicSearchResponse.self, from: data)
    }

    func fetchSpotifyConnection(accessToken: String?, userID: String?, anonymousSessionID: String) async throws -> SpotifyConnectionRecord? {
        if let accessToken, let userID {
            let rows: [SpotifyConnectionRecord] = try await fetchRows(
                table: "spotify_connections",
                accessToken: accessToken,
                queryItems: [
                    .init(name: "select", value: "spotify_user_id,display_name,product"),
                    .init(name: "user_id", value: "eq.\(userID)"),
                    .init(name: "order", value: "updated_at.desc"),
                    .init(name: "limit", value: "1"),
                ]
            )
            if let first = rows.first {
                return first
            }
        }

        let rows: [SpotifyConnectionRecord] = try await fetchRows(
            table: "spotify_connections",
            accessToken: accessToken,
            queryItems: [
                .init(name: "select", value: "spotify_user_id,display_name,product"),
                .init(name: "anonymous_session_id", value: "eq.\(anonymousSessionID)"),
                .init(name: "limit", value: "1"),
            ]
        )
        return rows.first
    }

    func spotifyAuthorizationURL(accessToken: String, redirectURI: String, sessionID: String) async throws -> URL {
        let body = try encoder.encode([
            "action": "get_auth_url",
            "redirect_uri": redirectURI,
            "session_id": sessionID,
        ])
        let data = try await sendFunctionRequest(name: "spotify-auth", accessToken: accessToken, body: body)
        let payload = try decode([String: String].self, from: data)
        guard let urlString = payload["url"], let url = URL(string: urlString) else {
            throw SupabaseServiceError.invalidResponse
        }
        return url
    }

    func exchangeSpotifyCode(code: String, redirectURI: String, accessToken: String, sessionID: String) async throws -> SpotifyConnectionRecord {
        let body = try encoder.encode([
            "action": "exchange_code",
            "code": code,
            "redirect_uri": redirectURI,
            "session_id": sessionID,
        ])
        let data = try await sendFunctionRequest(name: "spotify-auth", accessToken: accessToken, body: body)
        return try decode(SpotifyConnectionRecord.self, from: data)
    }

    func fetchSpotifyPlaybackToken(accessToken: String?, sessionID: String) async throws -> SpotifyPlaybackToken {
        let body = try encoder.encode([
            "action": "get_token",
            "session_id": sessionID,
        ])
        let data = try await sendFunctionRequest(name: "spotify-auth", accessToken: accessToken, body: body)
        return try decode(SpotifyPlaybackToken.self, from: data)
    }

    func disconnectSpotify(accessToken: String?, sessionID: String) async throws {
        let body = try encoder.encode([
            "action": "disconnect",
            "session_id": sessionID,
        ])
        _ = try await sendFunctionRequest(name: "spotify-auth", accessToken: accessToken, body: body)
    }

    func spotifySaveTracks(trackIDs: [String], accessToken: String?, sessionID: String) async throws {
        let body = try encoder.encode([
            "action": AnyEncodable("save_tracks"),
            "track_ids": AnyEncodable(trackIDs),
            "session_id": AnyEncodable(sessionID),
        ])
        _ = try await sendFunctionRequest(name: "spotify-auth", accessToken: accessToken, body: body)
    }

    func spotifyListPlaylists(accessToken: String?, sessionID: String) async throws -> [StreamingPlaylist] {
        let body = try encoder.encode([
            "action": "list_playlists",
            "session_id": sessionID,
        ])
        let data = try await sendFunctionRequest(name: "spotify-auth", accessToken: accessToken, body: body)
        let payload = try decode([String: [StreamingPlaylist]].self, from: data)
        return payload["playlists"] ?? []
    }

    func spotifyAddTrackToPlaylist(playlistID: String, trackID: String, accessToken: String?, sessionID: String) async throws {
        let body = try encoder.encode([
            "action": "add_to_playlist",
            "playlist_id": playlistID,
            "track_id": trackID,
            "session_id": sessionID,
        ])
        _ = try await sendFunctionRequest(name: "spotify-auth", accessToken: accessToken, body: body)
    }

    func spotifyEnsureEchoesPlaylist(accessToken: String?, sessionID: String) async throws -> String {
        let body = try encoder.encode([
            "action": "ensure_echoes_playlist",
            "session_id": sessionID,
        ])
        let data = try await sendFunctionRequest(name: "spotify-auth", accessToken: accessToken, body: body)
        let payload = try decode([String: String].self, from: data)
        guard let playlistID = payload["playlist_id"], !playlistID.isEmpty else {
            throw SupabaseServiceError.invalidResponse
        }
        return playlistID
    }

    func spotifyReplacePlaylistTracks(playlistID: String, trackIDs: [String], accessToken: String?, sessionID: String) async throws {
        let body = try encoder.encode([
            "action": AnyEncodable("replace_playlist_tracks"),
            "playlist_id": AnyEncodable(playlistID),
            "track_ids": AnyEncodable(trackIDs),
            "session_id": AnyEncodable(sessionID),
        ])
        _ = try await sendFunctionRequest(name: "spotify-auth", accessToken: accessToken, body: body)
    }

    private func sendAuthRequest(method: String, path: String, accessToken: String? = nil, body: Data? = nil) async throws -> Data {
        var request = URLRequest(url: config.supabaseURL.appending(path: path))
        request.httpMethod = method
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        if let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }
        return try await perform(request)
    }

    private func fetchRows<T: Decodable>(table: String, accessToken: String?, queryItems: [URLQueryItem]) async throws -> [T] {
        var components = URLComponents(url: config.supabaseURL.appending(path: "/rest/v1/\(table)"), resolvingAgainstBaseURL: false)!
        components.queryItems = queryItems

        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        } else {
            request.setValue("Bearer \(config.anonKey)", forHTTPHeaderField: "Authorization")
        }

        let data = try await perform(request)
        return try decode([T].self, from: data)
    }

    private func mutateRows<T: Decodable>(
        method: String,
        table: String,
        accessToken: String?,
        queryItems: [URLQueryItem] = [],
        body: Data
    ) async throws -> [T] {
        var components = URLComponents(url: config.supabaseURL.appending(path: "/rest/v1/\(table)"), resolvingAgainstBaseURL: false)!
        components.queryItems = queryItems.isEmpty ? nil : queryItems

        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.httpBody = body
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        if let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        } else {
            request.setValue("Bearer \(config.anonKey)", forHTTPHeaderField: "Authorization")
        }

        let data = try await perform(request)
        return try decode([T].self, from: data)
    }

    private func sendFunctionRequest(name: String, accessToken: String?, body: Data) async throws -> Data {
        var request = URLRequest(url: config.supabaseURL.appending(path: "/functions/v1/\(name)"))
        request.httpMethod = "POST"
        request.httpBody = body
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        } else {
            request.setValue("Bearer \(config.anonKey)", forHTTPHeaderField: "Authorization")
        }
        return try await perform(request)
    }

    private func perform(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw SupabaseServiceError.invalidResponse
        }

        guard (200..<300).contains(http.statusCode) else {
            if http.statusCode == 401 {
                throw SupabaseServiceError.unauthorized
            }
            if let server = try? decoder.decode(MusicSearchResponse.self, from: data), let error = server.error {
                throw SupabaseServiceError.server(error)
            }
            if
                let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                let message = payload["msg"] as? String ?? payload["error_description"] as? String ?? payload["message"] as? String ?? payload["error"] as? String
            {
                throw SupabaseServiceError.server(message)
            }
            throw SupabaseServiceError.server(HTTPURLResponse.localizedString(forStatusCode: http.statusCode))
        }

        return data
    }

    private func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw SupabaseServiceError.invalidResponse
        }
    }
}

private struct AnyEncodable: Encodable {
    private let encodeImpl: (Encoder) throws -> Void

    init<T: Encodable>(_ wrapped: T) {
        self.encodeImpl = { encoder in
            try wrapped.encode(to: encoder)
        }
    }

    func encode(to encoder: Encoder) throws {
        try encodeImpl(encoder)
    }
}
