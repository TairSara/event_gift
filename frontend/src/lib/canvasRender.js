/**
 * Canvas rendering utilities for invitation builder
 */

/**
 * Draw text in a bounding box with auto-sizing
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to draw
 * @param {object} box - Bounding box {x, y, w, h}
 * @param {string} family - Font family
 * @param {number} weight - Font weight
 * @param {number} maxSize - Maximum font size
 * @param {string} color - Text color
 * @param {string} colorOverride - Optional color override
 */
export function drawTextInBox(ctx, text, box, family, weight, maxSize, color, colorOverride = null) {
  if (!text) return;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = maxSize;

  const fits = (s) => {
    ctx.font = `${weight} ${s}px ${family}`;
    const m = ctx.measureText(text);
    const h = (m.actualBoundingBoxAscent || s * 0.8) + (m.actualBoundingBoxDescent || s * 0.2);
    return m.width <= box.w * 0.9 && h <= box.h * 0.9;
  };

  while (size > 8 && !fits(size)) {
    size--;
  }

  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = colorOverride || color;
  ctx.fillText(text, box.x + box.w / 2, box.y + box.h / 2);
}

/**
 * Draw a text field on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to draw
 * @param {object} field - Field configuration
 * @param {string} colorOverride - Optional color override
 */
export function drawTextField(ctx, text, field, colorOverride = null) {
  // Don't draw anything if there's no text
  if (!text) return;

  // Build the display text with prefix, wrapper, and suffix
  let displayText = text;

  // Add wrapper if specified (e.g., parentheses)
  if (displayText && field.wrapper) {
    if (field.wrapper === 'parentheses') {
      displayText = `(${displayText})`;
    } else if (field.wrapper === 'quotes') {
      displayText = `"${displayText}"`;
    }
  }

  // Add prefix
  if (field.prefix) {
    displayText = `${field.prefix}${displayText}`;
  }

  // Add suffix
  if (field.suffix) {
    displayText = `${displayText}${field.suffix}`;
  }

  ctx.font = `${field.fontWeight} ${field.fontSize}px ${field.fontFamily}`;
  ctx.fillStyle = colorOverride || field.color;
  ctx.textAlign = field.align || 'center';
  ctx.textBaseline = 'middle';

  // Handle multi-line text (split by \n)
  const lines = displayText.split('\n');
  const lineHeight = field.fontSize * 1.2;

  lines.forEach((line, index) => {
    const yOffset = index * lineHeight;
    ctx.fillText(line, field.x, field.y + yOffset);
  });
}

/**
 * Load an image and return a promise
 * @param {string} src - Image source URL
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Render invitation side (front or back)
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {object} template - Template configuration
 * @param {object} values - Field values
 * @param {string} side - 'front' or 'back'
 */
export async function renderSide(canvas, template, values, side = 'front') {
  try {
    const ctx = canvas.getContext('2d');
    const { w, h } = template.size;

    // Set canvas size
    canvas.width = w;
    canvas.height = h;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // If custom background is allowed and provided, draw it first
    if (template.allowCustomBackground) {
      const customBg = side === 'front' ? values.customBackgroundFront : values.customBackgroundBack;
      if (customBg) {
        console.log(`Loading custom background for ${side}`);
        const customBgImage = await loadImage(customBg);
        console.log(`Drawing custom background on canvas`);
        ctx.drawImage(customBgImage, 0, 0, w, h);
      }
    }

    // Load and draw template background (as overlay)
    const bgSrc = side === 'front' ? template.frontBg : template.backBg;
    if (bgSrc) {
      console.log(`Loading ${side} background:`, bgSrc);
      const bgImage = await loadImage(bgSrc);
      console.log(`Drawing ${side} background on canvas`);
      ctx.drawImage(bgImage, 0, 0, w, h);
    }

    // Draw fields
    const fields = side === 'front' ? template.frontFields : template.backFields;
    const colorOverride = values.textColor || null;

    fields.forEach(field => {
      // Skip fields that are only for input (not for display)
      if (field.isInput) return;

      let value;

      // Handle static text fields
      if (field.staticText) {
        value = field.staticText;
      }
      // Handle combined fields
      else if (field.isCombined && field.combineFields) {
        const parts = [];

        field.combineFields.forEach((key, index) => {
          let val = values[key];
          if (val) {
            // Find the input field definition to check for wrapper and suffix
            const inputField = fields.find(f => f.key === key && f.isInput);

            if (inputField) {
              // Add wrapper if specified
              if (inputField.wrapper) {
                if (inputField.wrapper === 'parentheses') {
                  val = `(${val})`;
                } else if (inputField.wrapper === 'quotes') {
                  val = `"${val}"`;
                }
              }

              // Add suffix if specified
              if (inputField.suffix) {
                val = `${val}${inputField.suffix}`;
              }
            }

            parts.push(val);
          }
        });

        if (parts.length > 0) {
          value = parts.join(field.combineSeparator || ' ');
        }
      } else {
        value = values[field.key];
      }

      if (value || field.prefix) {
        console.log(`Drawing field ${field.key}:`, value);
        drawTextField(ctx, value, field, colorOverride);
      }
    });

    // Draw slots
    const slots = side === 'front' ? template.frontSlots : template.backSlots;
    if (slots) {
      slots.forEach(slot => {
        // Handle static text slots
        let value;
        if (slot.staticText) {
          value = slot.staticText;
        } else {
          value = values[slot.key];
        }

        if (value) {
          console.log(`Drawing slot ${slot.key}:`, value);
          drawTextInBox(ctx, value, slot.box, slot.family, slot.weight, slot.maxSize, slot.color, colorOverride);
        }
      });
    }

    console.log(`Finished rendering ${side}`);
  } catch (error) {
    console.error(`Error rendering ${side}:`, error);
    throw error;
  }
}

/**
 * Combine front and back canvases with mockup background
 * @param {HTMLCanvasElement} frontCanvas - Front canvas
 * @param {HTMLCanvasElement} backCanvas - Back canvas
 * @param {object} template - Template with mockup settings
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function combineCanvasesWithMockup(frontCanvas, backCanvas, template) {
  console.log('combineCanvasesWithMockup called', {
    frontCanvas,
    backCanvas,
    hasFront: !!frontCanvas,
    hasBack: !!backCanvas,
    mockupBg: template.mockupBg
  });

  if (!frontCanvas || !backCanvas) {
    console.error('Missing canvas:', { frontCanvas, backCanvas });
    throw new Error('Front or back canvas is null');
  }

  const out = document.createElement('canvas');

  // Load mockup background
  console.log('Loading mockup background:', template.mockupBg);
  const mockupBg = await loadImage(template.mockupBg);
  console.log('Mockup loaded:', mockupBg.width, 'x', mockupBg.height);

  out.width = mockupBg.width;
  out.height = mockupBg.height;

  const ctx = out.getContext('2d');

  // Draw mockup background
  ctx.drawImage(mockupBg, 0, 0);
  console.log('Mockup background drawn');

  // Get mockup layout settings
  const { frontPosition, backPosition } = template.mockupLayout;

  // Helper function to draw canvas with transform
  const drawWithTransform = (canvas, position, label) => {
    console.log(`Drawing ${label}:`, {
      canvasWidth: canvas?.width,
      canvasHeight: canvas?.height,
      position
    });

    if (!canvas) {
      console.error(`${label} canvas is null`);
      return;
    }

    ctx.save();

    // Move to position
    ctx.translate(position.x, position.y);

    // Apply rotation
    if (position.rotation) {
      ctx.rotate((position.rotation * Math.PI) / 180);
    }

    // Apply scale
    const scale = position.scale || 1;
    const w = canvas.width * scale;
    const h = canvas.height * scale;

    // Add shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;

    // Draw canvas
    ctx.drawImage(canvas, 0, 0, w, h);
    console.log(`${label} drawn successfully`);

    ctx.restore();
  };

  // Draw back canvas first (so it appears behind)
  drawWithTransform(backCanvas, backPosition, 'Back');

  // Draw front canvas on top
  drawWithTransform(frontCanvas, frontPosition, 'Front');

  console.log('Combined mockup complete');
  return out;
}

/**
 * Combine front and back canvases (legacy - simple version)
 * @param {HTMLCanvasElement} frontCanvas - Front canvas
 * @param {HTMLCanvasElement} backCanvas - Back canvas
 * @param {object} options - Combination options
 * @returns {HTMLCanvasElement}
 */
export function combineCanvases(frontCanvas, backCanvas, options = {}) {
  const { layout = 'side', gap = 60, bgMockup = null } = options;

  const W = frontCanvas.width;
  const H = frontCanvas.height;
  const out = document.createElement('canvas');

  // Create canvas with padding for cream background
  const padding = 40;

  if (layout === 'side') {
    out.width = W * 2 + gap + (padding * 2);
    out.height = H + (padding * 2);
  } else {
    out.width = W + (padding * 2);
    out.height = H * 2 + gap + (padding * 2);
  }

  const ctx = out.getContext('2d');

  // Cream background color
  ctx.fillStyle = '#FFF8DC'; // Cream color
  ctx.fillRect(0, 0, out.width, out.height);

  if (bgMockup) {
    ctx.drawImage(bgMockup, 0, 0, out.width, out.height);
  }

  if (layout === 'side') {
    // Front on the left, back on the right
    ctx.drawImage(frontCanvas, padding, padding, W, H);
    ctx.drawImage(backCanvas, W + gap + padding, padding, W, H);
  } else {
    ctx.drawImage(frontCanvas, padding, padding, W, H);
    ctx.drawImage(backCanvas, padding, H + gap + padding, W, H);
  }

  return out;
}
