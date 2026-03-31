from src.preprocessing import preprocess_data
from src.train import train_model

def run_pipeline():
    print("Starting pipeline...")

    # Step 1: Preprocessing
    X_train, X_test, y_train, y_test = preprocess_data("data/raw/data.csv")

    # Step 2: Training
    model = train_model(X_train, y_train)

    print("Pipeline completed successfully!")

if __name__ == "__main__":
    run_pipeline()