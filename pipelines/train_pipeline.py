from src.preprocessing import preprocess_data
from src.train import train_model
import os

def run_pipeline():
    print("Starting pipeline...")

    data_path = "data/raw/data.csv"

    # ✅ Handle missing dataset in CI
    if not os.path.exists(data_path):
        print("Dataset not found. Skipping training.")
        return

    X_train, X_test, y_train, y_test = preprocess_data(data_path)
    model = train_model(X_train, y_train)

    print("Pipeline completed successfully!")

if __name__ == "__main__":
    run_pipeline()