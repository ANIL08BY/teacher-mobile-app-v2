import Foundation
import UIKit

// 15. Hafta iOS Native Modül Örneği (Swift)
@objc(CustomToastModule)
class CustomToastModule: NSObject {

  @objc
  func showToast(_ message: String) {
    DispatchQueue.main.async {
      let alert = UIAlertController(title: "iOS Native Mesaj", message: message, preferredStyle: .alert)
      alert.addAction(UIAlertAction(title: "Tamam", style: .default, handler: nil))
      
      if let rootVC = UIApplication.shared.keyWindow?.rootViewController {
        rootVC.present(alert, animated: true, completion: nil)
      }
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}