from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model   = joblib.load("models/model.pkl")
columns = joblib.load("models/columns.pkl")

@app.get("/")
def home():
    return {"message": "Placement Prediction API is running"}

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}

@app.post("/predict")
@app.post("/predict-json")
def predict(data: dict):
    try:
        df = pd.DataFrame([data])
        df = pd.get_dummies(df)
        df = df.reindex(columns=columns, fill_value=0)

        prediction  = int(model.predict(df)[0])
        probability = float(model.predict_proba(df)[0][1])

        return {
            "prediction":  prediction,
            "probability": probability
        }
    except Exception as e:
        return {"error": str(e)}