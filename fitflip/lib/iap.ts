import { isNativePlatform, nativePlatform } from "./native";

// In-app purchases (native only) via RevenueCat. Every function is a no-op on
// the web, where Stripe Checkout handles payments instead. The RevenueCat
// plugin is imported dynamically so it never touches the SSR/web bundle path.
//
// The RevenueCat "entitlement" that maps to FitFlip Pro. Must match the
// entitlement identifier configured in the RevenueCat dashboard.
export const PRO_ENTITLEMENT = "pro";

export type IapPlan = "monthly" | "yearly";

export type IapPlanInfo = {
  plan: IapPlan;
  priceString: string; // store-localized, e.g. "2 490 Ft"
  identifier: string;
};

let configuredFor: string | null = null;

function apiKey(): string | undefined {
  return nativePlatform() === "ios"
    ? process.env.NEXT_PUBLIC_RC_IOS_KEY
    : process.env.NEXT_PUBLIC_RC_ANDROID_KEY;
}

// True when running natively AND a RevenueCat key is configured — i.e. native
// purchases are actually available. While the keys are absent the native app
// transparently falls back to the Stripe flow.
export function iapAvailable(): boolean {
  return isNativePlatform() && !!apiKey();
}

// Configure RevenueCat with the Supabase user id as the app user id, so the
// RevenueCat webhook can map a purchase back to the right profile. Safe to call
// repeatedly; re-logs-in if the user changed.
export async function initIap(supabaseUserId: string): Promise<void> {
  if (!iapAvailable() || !supabaseUserId) return;
  const key = apiKey()!;
  const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");
  if (configuredFor === null) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
    await Purchases.configure({ apiKey: key, appUserID: supabaseUserId });
    configuredFor = supabaseUserId;
  } else if (configuredFor !== supabaseUserId) {
    await Purchases.logIn({ appUserID: supabaseUserId });
    configuredFor = supabaseUserId;
  }
}

// The store-localized price for each plan from the current RevenueCat offering.
export async function getPlans(): Promise<IapPlanInfo[]> {
  if (!iapAvailable()) return [];
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  const out: IapPlanInfo[] = [];
  if (current.annual) {
    out.push({
      plan: "yearly",
      priceString: current.annual.product.priceString,
      identifier: current.annual.identifier,
    });
  }
  if (current.monthly) {
    out.push({
      plan: "monthly",
      priceString: current.monthly.product.priceString,
      identifier: current.monthly.identifier,
    });
  }
  return out;
}

// Launches the native purchase sheet for the chosen plan. Resolves to true when
// the Pro entitlement is active afterwards. Throws "cancelled" if the user
// dismissed the sheet.
export async function purchasePro(plan: IapPlan): Promise<boolean> {
  if (!iapAvailable()) return false;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) throw new Error("no_offering");
  const pkg = plan === "yearly" ? current.annual : current.monthly;
  if (!pkg) throw new Error("no_package");
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return !!customerInfo.entitlements.active[PRO_ENTITLEMENT];
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "1") {
      // PURCHASE_CANCELLED
      throw new Error("cancelled");
    }
    throw err;
  }
}

// Restores prior purchases (App Store / Play account). Resolves to true if Pro
// is active afterwards.
export async function restorePro(): Promise<boolean> {
  if (!iapAvailable()) return false;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const { customerInfo } = await Purchases.restorePurchases();
  return !!customerInfo.entitlements.active[PRO_ENTITLEMENT];
}

// The store's own subscription-management URL for the current user (App Store /
// Play subscriptions). Used instead of the Stripe billing portal in the app.
export async function managementUrl(): Promise<string | null> {
  if (!iapAvailable()) return null;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const { customerInfo } = await Purchases.getCustomerInfo();
  return customerInfo.managementURL ?? null;
}

// Current entitlement state straight from RevenueCat's cached customer info.
export async function hasProEntitlement(): Promise<boolean> {
  if (!iapAvailable()) return false;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const { customerInfo } = await Purchases.getCustomerInfo();
  return !!customerInfo.entitlements.active[PRO_ENTITLEMENT];
}
