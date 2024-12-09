import { useState, useRef, useCallback } from "react";

const PositionSelector = ({ currentPosition, totalItems, onReorder }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [previewPosition, setPreviewPosition] = useState(currentPosition);
  const [startY, setStartY] = useState(0);
  const longPressTimer = useRef(null);

  const handleTouchStart = useCallback(
    (e) => {
      longPressTimer.current = setTimeout(() => {
        setIsSelecting(true);
        setStartY(e.touches[0].clientY);
        setPreviewPosition(currentPosition);

        document.body.style.overflow = "hidden";
      }, 500);

      e.preventDefault();
    },
    [currentPosition]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (isSelecting) {
        const movement = startY - e.touches[0].clientY;
        const positionChange = Math.round(movement / 40);

        // Calculate new preview position
        const newPosition = Math.max(
          0,
          Math.min(totalItems - 1, currentPosition + positionChange)
        );

        setPreviewPosition(newPosition);
        e.preventDefault();
      }
    },
    [isSelecting, startY, currentPosition, totalItems]
  );

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);

    if (isSelecting) {
      if (previewPosition !== currentPosition) {
        onReorder(currentPosition, previewPosition);
      }
      setIsSelecting(false);
      document.body.style.overflow = "";
    }
  }, [isSelecting, previewPosition, currentPosition, onReorder]);

  return (
    <div
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full 
        ${isSelecting ? "bg-blue-600 scale-110 shadow-lg" : "bg-blue-500"} 
        text-white select-none transition-transform duration-200`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "none" }}
    >
      {isSelecting ? previewPosition + 1 : currentPosition + 1}
    </div>
  );
};

export default PositionSelector;
