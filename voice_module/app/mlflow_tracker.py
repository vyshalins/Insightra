"""
Centralized MLflow experiment tracker for the Insightra Review Intelligence pipeline.

Usage — start a named run from any entry-point (e.g. a route handler):

    from mlflow_tracker import tracker

    with tracker.run("sentiment_analysis_v1"):
        tracker.log_param("dataset_size", 500)
        tracker.log_metric("urgency_score", 72.4)

The context-manager nesting is safe: inner calls outside an active run are
silently swallowed so existing code paths that do NOT call tracker.run() still
work without raising exceptions.
"""

from __future__ import annotations

import os
import contextlib
from typing import Any, Generator

# ---------------------------------------------------------------------------
# Constants — override via environment variables if needed
# ---------------------------------------------------------------------------
TRACKING_URI: str = os.getenv("MLFLOW_TRACKING_URI", "mlruns")  # local folder
EXPERIMENT_NAME: str = os.getenv("MLFLOW_EXPERIMENT_NAME", "Review_Analysis_Project")


class _InsightraTracker:
    """Thin wrapper around MLflow so the rest of the codebase never imports
    mlflow directly.  All methods are no-ops when mlflow is not installed or
    when called outside an active run."""

    def __init__(self) -> None:
        self._mlflow: Any = None
        self._ready = False
        self._setup()

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------

    def _setup(self) -> None:
        """Lazily import mlflow and configure tracking URI + experiment."""
        try:
            import mlflow  # type: ignore[import-not-found]

            mlflow.set_tracking_uri(TRACKING_URI)
            mlflow.set_experiment(EXPERIMENT_NAME)
            self._mlflow = mlflow
            self._ready = True
        except ImportError:
            # MLflow not installed — run silently in no-op mode.
            self._ready = False

    # ------------------------------------------------------------------
    # Context manager — wraps mlflow.start_run
    # ------------------------------------------------------------------

    @contextlib.contextmanager
    def run(
        self,
        run_name: str = "insightra_run",
        tags: dict[str, str] | None = None,
        nested: bool = False,
    ) -> Generator[None, None, None]:
        """
        Context manager that wraps a logical pipeline run.

        Parameters
        ----------
        run_name  : Human-readable label visible in the MLflow UI.
        tags      : Optional key-value metadata attached to the run.
        nested    : Set True if this run is started inside another active run.
        """
        if not self._ready:
            yield
            return

        with self._mlflow.start_run(run_name=run_name, tags=tags or {}, nested=nested):
            yield

    # ------------------------------------------------------------------
    # Logging helpers — all silent when no active run
    # ------------------------------------------------------------------

    def _active(self) -> bool:
        return self._ready and self._mlflow.active_run() is not None

    def log_param(self, key: str, value: Any) -> None:
        if self._active():
            try:
                self._mlflow.log_param(key, value)
            except Exception:
                pass

    def log_params(self, params: dict[str, Any]) -> None:
        if self._active():
            try:
                self._mlflow.log_params(params)
            except Exception:
                pass

    def log_metric(self, key: str, value: float, step: int | None = None) -> None:
        if self._active():
            try:
                self._mlflow.log_metric(key, value, step=step)
            except Exception:
                pass

    def log_metrics(self, metrics: dict[str, float], step: int | None = None) -> None:
        if self._active():
            try:
                self._mlflow.log_metrics(metrics, step=step)
            except Exception:
                pass

    def log_artifact(self, local_path: str, artifact_path: str | None = None) -> None:
        """Log any local file (image, CSV, JSON) as a run artifact."""
        if self._active():
            try:
                self._mlflow.log_artifact(local_path, artifact_path=artifact_path)
            except Exception:
                pass

    def log_dict(self, dictionary: dict[str, Any], artifact_file: str) -> None:
        """Serialize and log a dict as a JSON artifact (requires mlflow >= 1.18)."""
        if self._active():
            try:
                self._mlflow.log_dict(dictionary, artifact_file)
            except Exception:
                pass

    def set_tag(self, key: str, value: str) -> None:
        if self._active():
            try:
                self._mlflow.set_tag(key, value)
            except Exception:
                pass

    def log_sklearn_model(self, model: Any, artifact_name: str = "model") -> None:
        """Log a scikit-learn compatible model."""
        if self._active():
            try:
                self._mlflow.sklearn.log_model(model, artifact_name)
            except Exception:
                pass

    def log_pytorch_model(self, model: Any, artifact_name: str = "model") -> None:
        """Log a PyTorch / HuggingFace model."""
        if self._active():
            try:
                self._mlflow.pytorch.log_model(model, artifact_name)
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Module-level singleton — ``from mlflow_tracker import tracker``
# ---------------------------------------------------------------------------
tracker = _InsightraTracker()
