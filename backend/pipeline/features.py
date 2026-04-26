"""Shared ResNet-18 feature extractor used across the pipeline."""
from functools import lru_cache
import cv2
import numpy as np
import torch
from PIL import Image
from torchvision.models import resnet18, ResNet18_Weights
from torchvision.transforms import Compose, Normalize, Resize, ToTensor


@lru_cache(maxsize=1)
def _load_model():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = resnet18(weights=ResNet18_Weights.DEFAULT)
    model = torch.nn.Sequential(*list(model.children())[:-1])
    model.to(device).eval()
    transform = Compose([
        Resize((224, 224)),
        ToTensor(),
        Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    return device, model, transform


def get_extractor():
    """Return (device, resnet_model, transform). Cached after first call."""
    return _load_model()


def features_from_bgr(img: np.ndarray) -> np.ndarray:
    device, model, transform = _load_model()
    pil = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    tensor = transform(pil).unsqueeze(0).to(device)
    with torch.no_grad():
        feats = model(tensor)
    return feats.squeeze().cpu().numpy()


def features_from_pil(img: Image.Image) -> np.ndarray:
    device, model, transform = _load_model()
    tensor = transform(img).unsqueeze(0).to(device)
    with torch.no_grad():
        feats = model(tensor)
    return feats.squeeze().cpu().numpy()


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def similarity(img1: np.ndarray, img2: np.ndarray) -> float:
    return cosine_similarity(features_from_bgr(img1), features_from_bgr(img2))
