import UIKit
import Capacitor
import WebKit

final class LibertyBridgeViewController: CAPBridgeViewController {
    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let configuration = super.webViewConfiguration(for: instanceConfiguration)
        let nativeMarker = WKUserScript(
            source: """
                window.__LIBERTY_LIFT_NATIVE__ = true;
                (function markNativeEnvironment() {
                    if (document.documentElement) {
                        document.documentElement.dataset.appEnvironment = 'native';
                    } else {
                        requestAnimationFrame(markNativeEnvironment);
                    }
                })();
                """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        configuration.userContentController.addUserScript(nativeMarker)
        return configuration
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        view.backgroundColor = UIColor(red: 16 / 255, green: 16 / 255, blue: 15 / 255, alpha: 1)
        webView?.backgroundColor = view.backgroundColor
        webView?.isOpaque = false
        webView?.allowsBackForwardNavigationGestures = true
        webView?.scrollView.alwaysBounceVertical = true
        webView?.scrollView.decelerationRate = .normal
        webView?.scrollView.keyboardDismissMode = .interactive
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = LibertyBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
