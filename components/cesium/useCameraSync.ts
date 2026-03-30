"use client";

import { Viewer as CesiumViewer } from "cesium";
import { RefObject, useEffect, useRef } from "react";

/**
 * Synchronizes camera between two Cesium Viewer instances.
 * Uses preRender event to copy camera state from the active viewer to the other.
 */
export function useCameraSync(
  leftViewerRef: RefObject<CesiumViewer | null>,
  rightViewerRef: RefObject<CesiumViewer | null>,
  enabled: boolean,
) {
  const isSyncingRef = useRef(false);
  const activeViewerRef = useRef<"left" | "right">("left");

  useEffect(() => {
    if (!enabled) return;

    const leftViewer = leftViewerRef.current;
    const rightViewer = rightViewerRef.current;
    if (!leftViewer || !rightViewer) return;

    const leftCanvas = leftViewer.canvas;
    const rightCanvas = rightViewer.canvas;

    const handleLeftPointerDown = () => {
      activeViewerRef.current = "left";
    };
    const handleRightPointerDown = () => {
      activeViewerRef.current = "right";
    };

    leftCanvas.addEventListener("pointerdown", handleLeftPointerDown);
    rightCanvas.addEventListener("pointerdown", handleRightPointerDown);

    // Sync camera from source to target
    function syncCamera(source: CesiumViewer, target: CesiumViewer) {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      try {
        const sourceCamera = source.camera;
        target.camera.setView({
          destination: sourceCamera.positionWC.clone(),
          orientation: {
            heading: sourceCamera.heading,
            pitch: sourceCamera.pitch,
            roll: sourceCamera.roll,
          },
        });
        target.scene.requestRender();
      } finally {
        isSyncingRef.current = false;
      }
    }

    const onLeftPreRender = () => {
      if (
        activeViewerRef.current === "left" &&
        rightViewer &&
        !rightViewer.isDestroyed()
      ) {
        syncCamera(leftViewer, rightViewer);
      }
    };

    const onRightPreRender = () => {
      if (
        activeViewerRef.current === "right" &&
        leftViewer &&
        !leftViewer.isDestroyed()
      ) {
        syncCamera(rightViewer, leftViewer);
      }
    };

    leftViewer.scene.preRender.addEventListener(onLeftPreRender);
    rightViewer.scene.preRender.addEventListener(onRightPreRender);

    // Initial sync: match right viewer to left viewer's camera
    syncCamera(leftViewer, rightViewer);

    return () => {
      leftCanvas.removeEventListener("pointerdown", handleLeftPointerDown);
      rightCanvas.removeEventListener("pointerdown", handleRightPointerDown);

      if (!leftViewer.isDestroyed()) {
        leftViewer.scene.preRender.removeEventListener(onLeftPreRender);
      }
      if (!rightViewer.isDestroyed()) {
        rightViewer.scene.preRender.removeEventListener(onRightPreRender);
      }
    };
  }, [enabled, leftViewerRef, rightViewerRef]);
}
