from fastapi import FastAPI
import joblib
import pandas as pd

app = FastAPI()

# Load model + columns
model = joblib.load("models/model.pkl")
columns = joblib.load("models/columns.pkl")

@app.get("/")
def home():
    return {"message": "Placement Prediction API is running"}

@app.post("/predict")
def predict(data: dict):
    try:
        # Convert input to DataFrame
        df = pd.DataFrame([data])

        # One-hot encoding
        df = pd.get_dummies(df)

        # Align with training columns
        df = df.reindex(columns=columns, fill_value=0)

        prediction = model.predict(df)

        return {"prediction": int(prediction[0])}

    except Exception as e:
        return {"error": str(e)}
    