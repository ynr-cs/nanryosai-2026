// Firebaseの基本機能を読み込みます
const functions = require("firebase-functions");
// Firebaseの管理者用機能（Firestoreへのアクセスなど）を読み込みます
const admin = require("firebase-admin");

// 管理者としてFirebaseアプリを初期化します
admin.initializeApp();
// Firestoreデータベースを操作するための準備をします
const db = admin.firestore();

/**
 * @name getNextReceiptNumber
 * @description 呼び出されるたびに、重複しない次の受付番号を安全に発行するCallable Function。
 * 番号は101から999まで。999の次は101に戻る。
 */
exports.getNextReceiptNumber = functions
.https.onCall(async (data, context) => {
    // Firestoreのcountersコレクションにあるreceiptドキュメントへの参照を取得
    const counterRef = db.collection('counters').doc('receipt');

    try {
      // トランザクション：複数のユーザーが同時にアクセスしても、処理が衝突しないように保護する仕組み
      const newNumber = await db.runTransaction(async (transaction) => {
        // 1. トランザクション内で、現在のカウンタードキュメントを読み込む
        const counterDoc = await transaction.get(counterRef);

        if (!counterDoc.exists) {
          throw new Error("カウンタードキュメントが存在しません！");
        }

        // 2. 現在の番号を取得し、次の番号を計算する
        let nextNumber = counterDoc.data().currentNumber + 1;

        // 3. もし番号が999を超えたら、100にリセットする
        if (nextNumber > 999) {
          nextNumber = 100;
        }

        // 4. トランザクション内で、カウンタードキュメントの番号を新しい番号に更新する
        transaction.update(counterRef, { currentNumber: nextNumber });

        // 5. このトランザクションの結果として、新しい番号を返す
        return nextNumber;
      });

      // 成功した場合、呼び出し元のWebページに新しい受付番号を返す
      return { receiptNumber: newNumber };

    } catch (error) {
      // もしエラーが起きたら、コンソールにエラーログを出力し、
      // 呼び出し元にエラーが発生したことを通知する
      console.error("採番中にエラーが発生しました:", error);
      throw new functions.https.HttpsError('internal', '受付番号の採番に失敗しました。');
    }
  });