import Foundation
import Capacitor
import WidgetKit

/**
 * Writes the wardrobe figure where the home-screen widget can read it.
 *
 * This exists because @capacitor/preferences can't do it on iOS: it always
 * writes to UserDefaults.standard, and its `group` option is only a key
 * prefix, not an App Group. A widget extension is a separate process with its
 * own container, so "standard" defaults are invisible to it — the shared
 * suite is the only way across.
 *
 * Android needs none of this: there the widget runs in the app's own process
 * and reads its SharedPreferences directly.
 */
@objc(FFWidgetBridge)
public class FFWidgetBridge: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FFWidgetBridge"
    public let jsName = "FFWidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setWardrobe", returnType: CAPPluginReturnPromise)
    ]

    /// Must match the App Group added to BOTH the app and the widget target.
    static let suiteName = "group.app.fitflip"
    static let storageKey = "ff-wardrobe"

    @objc func setWardrobe(_ call: CAPPluginCall) {
        let totalHuf = call.getDouble("totalHuf") ?? 0
        let itemCount = call.getInt("itemCount") ?? 0
        let streak = call.getInt("streak") ?? 0

        guard let defaults = UserDefaults(suiteName: Self.suiteName) else {
            // The App Group entitlement is missing. Report it rather than
            // failing silently — a widget stuck on "take a photo" with no
            // explanation is a bad afternoon.
            call.reject("App Group \(Self.suiteName) is not available")
            return
        }

        defaults.set(
            [
                "totalHuf": Int(totalHuf.rounded()),
                "itemCount": itemCount,
                "streak": streak,
                "updatedAt": ISO8601DateFormatter().string(from: Date())
            ],
            forKey: Self.storageKey
        )

        // Ask the system to redraw the tile. Without this the widget keeps
        // showing the old number until iOS decides to refresh it on its own,
        // which can be hours.
        WidgetCenter.shared.reloadAllTimelines()

        call.resolve()
    }
}
