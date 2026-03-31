from sklearn.ensemble import RandomForestClassifier
import joblib
import os

def train_model(X_train, y_train):
    print("Training model...")

    model = RandomForestClassifier()
    model.fit(X_train, y_train)

    os.makedirs("models", exist_ok=True)

    # Save model
    joblib.dump(model, "models/model.pkl")

    # ✅ Save feature column names
    joblib.dump(X_train.columns.tolist(), "models/columns.pkl")

    print("Model trained and saved!")

    return model