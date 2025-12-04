const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * @name getNextReceiptNumber
 * @description 【最終版】全ての完了・キャンセル済みステータスを考慮し、
 *              アクティブな注文で使われていない次の受付番号を安全に発行する。
 */
exports.getNextReceiptNumber = functions
  .https.onCall(async (data, context) => {

    const counterRef = db.collection('counters').doc('receipt');
    const ordersRef = db.collection('orders');

    try {
      const newNumber = await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists) {
          throw new Error("カウンタードキュメントが存在しません！");
        }

        let nextNumber = counterDoc.data().currentNumber;
        
        for (let i = 0; i < 900; i++) { // 安全装置: 900回試行
          nextNumber++;
          if (nextNumber > 999) {
            nextNumber = 100;
          }

          // 【修正点】完了済みの全ステータスを指定する
          // これら"以外"がアクティブな注文とみなされる
          const completedStatuses = [
            'completed_at_store', // 店舗での提供完了
            'completed_online',   // オンライン注文の提供完了
            'cancelled',          // キャンセル済み
            'abandoned_and_paid'  // 放置・決済済み
          ];

          const query = ordersRef
            .where('receiptNumber', '==', nextNumber)
            .where('status', 'not-in', completedStatuses);
          
          const snapshot = await transaction.get(query);

          if (snapshot.empty) {
            transaction.update(counterRef, { currentNumber: nextNumber });
            return nextNumber;
          }
        }

        throw new Error("利用可能な受付番号がありません。");
      });

      return { receiptNumber: newNumber };

    } catch (error) {
      console.error("採番中にエラーが発生しました:", error);
      throw new functions.https.HttpsError('internal', '受付番号の採番に失敗しました。');
    }
  });