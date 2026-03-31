import pandas as pd
from sklearn.model_selection import train_test_split

def preprocess_data(path):
    df = pd.read_csv(path)

    print("Data Loaded:", df.shape)

    df = df.dropna()

    y = df["placed"]
    X = df.drop("placed", axis=1)

    X = pd.get_dummies(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("Preprocessing Done")

    return X_train, X_test, y_train, y_test