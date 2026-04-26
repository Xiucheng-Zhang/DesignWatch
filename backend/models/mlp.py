"""MLP scoring head: aggregated workflow features + GT features + DTW -> 3 scalars."""
from __future__ import annotations

import torch
import torch.nn as nn


class MLP(nn.Module):
    def __init__(self, input_dim: int, output_dim: int, layers: list[int]):
        super().__init__()
        assert input_dim == layers[0], "input_dim must match layers[0]"
        self.hidden = nn.ModuleList(
            nn.Linear(layers[i], layers[i + 1]) for i in range(len(layers) - 1)
        )
        self.out = nn.Linear(layers[-1], output_dim)

    def forward(self, seq_a: torch.Tensor, seq_b: torch.Tensor, distance: torch.Tensor) -> torch.Tensor:
        x = torch.cat([seq_a, seq_b, distance], dim=-1)
        for layer in self.hidden:
            x = torch.relu(layer(x))
        return self.out(x)
