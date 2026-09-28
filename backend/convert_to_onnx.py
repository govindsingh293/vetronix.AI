import os
import torch
import torch.nn as nn
from torchvision import models


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PTH_PATH = os.path.join(
    BASE_DIR,
    "models",
    "mastitis_model.pth"
)

ONNX_PATH = os.path.join(
    BASE_DIR,
    "models",
    "mastitis_model.onnx"
)


print("=" * 60)
print("VETRONIX - PTH TO ONNX CONVERSION")
print("=" * 60)

print("PTH file:")
print(PTH_PATH)

print("ONNX output:")
print(ONNX_PATH)


# ============================================================
# CHECK FILE
# ============================================================

if not os.path.exists(PTH_PATH):
    raise FileNotFoundError(
        f"Model not found:\n{PTH_PATH}"
    )


# ============================================================
# CREATE SAME MOBILENETV2 ARCHITECTURE
# ============================================================

print("\nCreating MobileNetV2...")

model = models.mobilenet_v2(weights=None)

model.classifier[1] = nn.Linear(
    model.last_channel,
    2
)


# ============================================================
# LOAD YOUR PTH MODEL
# ============================================================

print("Loading mastitis_model.pth...")

checkpoint = torch.load(
    PTH_PATH,
    map_location="cpu",
    weights_only=False
)

print("Checkpoint type:")
print(type(checkpoint))


# ============================================================
# GET STATE DICTIONARY
# ============================================================

if isinstance(checkpoint, dict):

    if "state_dict" in checkpoint:

        state_dict = checkpoint["state_dict"]

        print("Using checkpoint['state_dict'].")

    elif "model_state_dict" in checkpoint:

        state_dict = checkpoint["model_state_dict"]

        print("Using checkpoint['model_state_dict'].")

    elif "model" in checkpoint and isinstance(
        checkpoint["model"],
        dict
    ):

        state_dict = checkpoint["model"]

        print("Using checkpoint['model'].")

    else:

        state_dict = checkpoint

        print("Using checkpoint directly.")


    # Remove module. prefix if present

    cleaned_state_dict = {}

    for key, value in state_dict.items():

        if key.startswith("module."):

            key = key.replace(
                "module.",
                "",
                1
            )

        cleaned_state_dict[key] = value

    state_dict = cleaned_state_dict

    model.load_state_dict(
        state_dict,
        strict=True
    )

elif isinstance(checkpoint, nn.Module):

    model = checkpoint

else:

    raise ValueError(
        "Unsupported PTH model format."
    )


# ============================================================
# EVALUATION MODE
# ============================================================

model = model.to("cpu")

model.eval()

print("Model loaded successfully.")


# ============================================================
# DUMMY IMAGE
# ============================================================

dummy_input = torch.randn(
    1,
    3,
    224,
    224
)


# ============================================================
# CONVERT TO ONNX
# ============================================================

print("\nConverting model to ONNX...")

torch.onnx.export(
    model,
    dummy_input,
    ONNX_PATH,
    export_params=True,
    opset_version=17,
    do_constant_folding=True,
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={
        "input": {
            0: "batch_size"
        },
        "output": {
            0: "batch_size"
        }
    },
    dynamo=False
)


print("\n" + "=" * 60)
print("CONVERSION SUCCESSFUL")
print("=" * 60)

print("ONNX file created:")
print(ONNX_PATH)

print("\nYou can now use:")
print("mastitis_model.onnx")