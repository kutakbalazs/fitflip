import UIKit
import SwiftUI
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    // Separate window that hosts the animated SwiftUI splash on top of the
    // Capacitor web view while the remote app loads.
    var splashWindow: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        showAnimatedSplash()
        return true
    }

    // Presents FitFlipSplashView in its own top-most window, then fades it out
    // after the entry + breathing animation has played (~2.2s).
    private func showAnimatedSplash() {
        let win = UIWindow(frame: UIScreen.main.bounds)
        win.windowLevel = .normal + 1
        win.rootViewController = UIHostingController(rootView: FitFlipSplashView())
        win.isUserInteractionEnabled = false
        win.makeKeyAndVisible()
        splashWindow = win

        DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) { [weak self] in
            UIView.animate(withDuration: 0.45, animations: {
                self?.splashWindow?.alpha = 0
            }, completion: { _ in
                self?.splashWindow?.isHidden = true
                self?.splashWindow = nil
            })
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

// MARK: - Animated splash (designed in Claude Design)
// Centered "FF" tile on a dark background, behind it a breathing blue glow,
// with a shimmer + gloss sweep across the mark. Entry: fade + scale + blur.

struct FitFlipSplashView: View {

    // Timings
    private let entryDuration   = 0.90
    private let breatheDuration = 3.25
    private let sweepDuration   = 1.70
    private let sweepDelay      = 0.40

    // Colors
    private let bg   = Color(red: 0.039, green: 0.047, blue: 0.067) // #0A0C11 background
    private let tile = Color(red: 0.114, green: 0.122, blue: 0.145) // #1D1F25 icon tile
    private let halo = Color(red: 0.518, green: 0.690, blue: 0.894) // #84B0E4 glow

    @State private var appeared = false
    @State private var breathe  = false
    @State private var sweep: CGFloat = 0

    private let iconSize: CGFloat = 96
    private let corner: CGFloat = 23

    var body: some View {
        ZStack {
            bg.ignoresSafeArea()

            RadialGradient(
                gradient: Gradient(stops: [
                    .init(color: halo.opacity(0.46), location: 0.00),
                    .init(color: halo.opacity(0.16), location: 0.38),
                    .init(color: halo.opacity(0.00), location: 0.68)
                ]),
                center: .center, startRadius: 0, endRadius: 230
            )
            .frame(width: 460, height: 460)
            .blur(radius: 6)
            .scaleEffect(breathe ? 1.18 : 1.0)
            .opacity(breathe ? 1.0 : 0.55)

            iconView
                .scaleEffect(appeared ? 1.0 : 0.92)
                .opacity(appeared ? 1.0 : 0.0)
                .blur(radius: appeared ? 0 : 7)
        }
        .onAppear { startAnimations() }
    }

    private var logoFont: Font {
        .system(size: 49, weight: .semibold, design: .serif)
    }

    private var iconView: some View {
        ZStack {
            Text("FF")
                .font(logoFont)
                .foregroundColor(Color(white: 0.886))

            GeometryReader { geo in
                let w = geo.size.width
                LinearGradient(
                    colors: [.clear, .white, .clear],
                    startPoint: .leading, endPoint: .trailing
                )
                .frame(width: w * 0.55)
                .offset(x: -w * 0.9 + sweep * (w * 1.9))
            }
            .mask(
                Text("FF").font(logoFont)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            )

            GeometryReader { geo in
                let w = geo.size.width
                LinearGradient(
                    colors: [.clear, .white.opacity(0.32), .clear],
                    startPoint: .leading, endPoint: .trailing
                )
                .frame(width: w * 0.5)
                .rotationEffect(.degrees(12))
                .offset(x: -w * 1.1 + sweep * (w * 2.2))
            }
        }
        .frame(width: iconSize, height: iconSize)
        .background(tile)
        .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: corner, style: .continuous)
                .strokeBorder(Color.white.opacity(0.06), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.5), radius: 22, x: 0, y: 20)
    }

    private func startAnimations() {
        withAnimation(.spring(response: entryDuration, dampingFraction: 0.82)) {
            appeared = true
        }
        withAnimation(.easeInOut(duration: breatheDuration).repeatForever(autoreverses: true)) {
            breathe = true
        }
        withAnimation(
            .easeInOut(duration: sweepDuration)
                .repeatForever(autoreverses: false)
                .delay(sweepDelay)
        ) {
            sweep = 1
        }
    }
}
