import WidgetKit
import SwiftUI

/**
 * Home-screen widget: one tap, camera open.
 *
 * The tile is a single tap target that opens https://www.fitflip.app/scan/new,
 * where the app fires the native camera on arrival. The bottom row says so in
 * words, because a widget that silently launches a camera is startling the
 * first time; the label turns a surprise into a promise.
 *
 * The wardrobe figure is whatever the app last wrote to the shared App Group.
 * A widget renders in its own process, on the system's schedule, with no
 * session and often no network — it cannot ask our API for anything. So the
 * number is as of the last time the app was opened, which is the normal
 * contract for a widget rather than a compromise.
 */

private let appGroup = "group.app.fitflip"
private let storageKey = "ff-wardrobe"
private let target = URL(string: "https://www.fitflip.app/scan/new")!

// Matches the launch splash, so the widget reads as part of the same app.
private let bgColor = Color(red: 0.039, green: 0.047, blue: 0.067)   // #0A0C11
private let strokeColor = Color(red: 0.114, green: 0.122, blue: 0.145) // #1D1F25
private let accent = Color(red: 0.518, green: 0.690, blue: 0.894)     // #84B0E4

struct WardrobeEntry: TimelineEntry {
    let date: Date
    let totalHuf: Int
    let itemCount: Int
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> WardrobeEntry {
        WardrobeEntry(date: Date(), totalHuf: 0, itemCount: 0)
    }

    func getSnapshot(in context: Context, completion: @escaping (WardrobeEntry) -> Void) {
        completion(read())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WardrobeEntry>) -> Void) {
        // .never: the value only changes when the app writes a new one, and
        // the app calls reloadAllTimelines when it does. A scheduled refresh
        // would redraw the same number and spend battery for nothing.
        completion(Timeline(entries: [read()], policy: .never))
    }

    private func read() -> WardrobeEntry {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let stored = defaults.dictionary(forKey: storageKey)
        else {
            return WardrobeEntry(date: Date(), totalHuf: 0, itemCount: 0)
        }
        return WardrobeEntry(
            date: Date(),
            totalHuf: stored["totalHuf"] as? Int ?? 0,
            itemCount: stored["itemCount"] as? Int ?? 0
        )
    }
}

/// Hungarian unless the device is set to English — the same fallback the app uses.
private var isHungarian: Bool {
    if #available(iOS 16.0, *) {
        return Locale.current.language.languageCode?.identifier != "en"
    }
    return Locale.current.languageCode != "en"
}

private func formatHuf(_ value: Int) -> String {
    let fmt = NumberFormatter()
    fmt.numberStyle = .decimal
    fmt.locale = Locale(identifier: "hu_HU")
    let number = fmt.string(from: NSNumber(value: value)) ?? "\(value)"
    return number.replacingOccurrences(of: "\u{00a0}", with: " ") + " Ft"
}

struct FitFlipWidgetView: View {
    let entry: WardrobeEntry

    private var hasValue: Bool { entry.itemCount > 0 && entry.totalHuf > 0 }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // The wordmark is never bold — the app header, the splash and the
            // emails all set it in the same unbolded serif.
            Text("FitFlip")
                .font(.system(size: 15, design: .serif))
                .tracking(-0.3)
                .foregroundColor(Color(white: 0.886))

            Spacer(minLength: 8)

            Text(hasValue ? formatHuf(entry.totalHuf) : (isHungarian ? "Fényképezz" : "Take a photo"))
                .font(.system(size: 22, weight: .bold))
                .minimumScaleFactor(0.7)
                .lineLimit(1)
                .foregroundColor(.white)

            Text(subtitle)
                .font(.system(size: 12))
                .lineLimit(1)
                .foregroundColor(Color(white: 0.54))

            Spacer(minLength: 8)

            HStack(spacing: 6) {
                Image(systemName: "camera.fill")
                    .font(.system(size: 12))
                Text(isHungarian ? "Koppints a fotózáshoz" : "Tap to take a photo")
                    .font(.system(size: 12))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .foregroundColor(accent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(target)
    }

    private var subtitle: String {
        if hasValue {
            return isHungarian
                ? "\(entry.itemCount) darab feldolgozva"
                : "\(entry.itemCount) items identified"
        }
        return isHungarian ? "Derítsd ki, mennyit ér" : "Find out what it's worth"
    }
}

@main
struct FitFlipWidget: Widget {
    let kind = "FitFlipWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                // containerBackground is required from iOS 17; without it the
                // widget renders with a blank system background.
                FitFlipWidgetView(entry: entry)
                    .padding(16)
                    .containerBackground(for: .widget) { bgColor }
            } else {
                FitFlipWidgetView(entry: entry)
                    .padding(16)
                    .background(bgColor)
            }
        }
        .configurationDisplayName("FitFlip")
        .description(
            isHungarian
                ? "Koppints a fotózáshoz. Mutatja a szekrényed értékét is."
                : "Tap to take a photo. Also shows what your wardrobe is worth."
        )
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}
