//
//  FitFlipSplashView.swift
//  FitFlip — animált töltőképernyő (splash)
//
//  Egy az egyben átvihető Claude Code-ba / Xcode-ba.
//  A vizuál: középre helyezett "FF" ikon sötét háttéren, mögötte
//  lélegző (breathing) kék fény-glow, az ikonon végigfutó shimmer +
//  gloss-csillanás. Belépéskor finom fade + scale + blur.
//
//  Használat:
//    1) Add hozzá ezt a fájlt a projekthez.
//    2) Mutasd ~2 mp-ig indításkor, majd válts a fő nézetre:
//
//       struct RootView: View {
//           @State private var ready = false
//           var body: some View {
//               if ready { ContentView() }
//               else { FitFlipSplashView()
//                   .task { try? await Task.sleep(for: .seconds(2)); ready = true } }
//           }
//       }
//
//  Betűtípus: alapból a rendszer serif fontját használja, így telepítés
//  nélkül is fut. Ha pontosan a "Spectral" SemiBold kell (mint a designban),
//  add hozzá a Spectral-SemiBold.ttf-et a projekthez (Info.plist → Fonts
//  provided by application), és cseréld a `logoFont` definícióját az alul
//  jelölt sorra.
//

import SwiftUI

struct FitFlipSplashView: View {

    // MARK: - Időzítések (a designhoz igazítva)
    private let entryDuration   = 0.90      // ikon belépés
    private let breatheDuration = 3.25      // fél ciklus (oda-vissza = 6.5 mp)
    private let sweepDuration   = 1.70      // shimmer + gloss egy áthaladás
    private let sweepDelay      = 0.40      // belépés után indul

    // MARK: - Színek
    private let bg   = Color(red: 0.039, green: 0.047, blue: 0.067) // #0A0C11 háttér (sötétebb, mint az ikon)
    private let tile = Color(red: 0.114, green: 0.122, blue: 0.145) // #1D1F25 ikon-csempe
    private let halo = Color(red: 0.518, green: 0.690, blue: 0.894) // #84B0E4 fény-glow

    // MARK: - Animációs állapot
    @State private var appeared = false
    @State private var breathe  = false
    @State private var sweep: CGFloat = 0   // 0 → 1, a csillanás pozíciója

    private let iconSize: CGFloat = 96
    private let corner: CGFloat = 23

    var body: some View {
        ZStack {
            bg.ignoresSafeArea()

            // 1) Lélegző színes háttérfény
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

            // 2) Középre helyezett ikon a csillanásokkal
            iconView
                .scaleEffect(appeared ? 1.0 : 0.92)
                .opacity(appeared ? 1.0 : 0.0)
                .blur(radius: appeared ? 0 : 7)
        }
        .onAppear { startAnimations() }
    }

    // MARK: - Ikon

    private var logoFont: Font {
        // Rendszer serif (telepítés nélkül fut):
        .system(size: 49, weight: .semibold, design: .serif)
        // Pontos design-font (Spectral hozzáadása után cseréld erre):
        // .custom("Spectral-SemiBold", size: 49)
    }

    private var iconView: some View {
        ZStack {
            // alap "FF" világosszürkén
            Text("FF")
                .font(logoFont)
                .foregroundColor(Color(white: 0.886)) // #E2E2E2

            // shimmer: fehér fénysáv végigfut a betűkön (a betűalakra maszkolva)
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

            // gloss: ferde fény-csík az egész csempén
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

    // MARK: - Animációk indítása

    private func startAnimations() {
        // belépés
        withAnimation(.spring(response: entryDuration, dampingFraction: 0.82)) {
            appeared = true
        }
        // lélegző glow (végtelen, oda-vissza)
        withAnimation(.easeInOut(duration: breatheDuration).repeatForever(autoreverses: true)) {
            breathe = true
        }
        // shimmer + gloss áthaladás (végtelen, szünettel a sáv szélessége miatt)
        withAnimation(
            .easeInOut(duration: sweepDuration)
                .repeatForever(autoreverses: false)
                .delay(sweepDelay)
        ) {
            sweep = 1
        }
    }
}

#Preview {
    FitFlipSplashView()
}
