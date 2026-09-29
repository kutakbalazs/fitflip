import UIKit
import Capacitor

/**
 * The app's bridge view controller, which exists to register FFWidgetBridge.
 *
 * Capacitor 6 dropped runtime discovery of plugin classes: a plugin that
 * lives in the app target rather than in a package has to be handed to the
 * bridge explicitly. Without this the class still compiles and ships, and
 * calls to it still leave the web layer — they are simply never answered.
 * That is worse than a missing plugin, which at least throws: the promise
 * hangs, and every caller downstream waits forever. The widget's numbers were
 * missing for exactly this reason, and nothing anywhere reported an error.
 *
 * Any future plugin defined inside this app target needs a line here too.
 */
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(FFWidgetBridge())
    }
}
