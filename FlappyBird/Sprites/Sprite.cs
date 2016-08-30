using SkiaSharp;

namespace FlappyBird.Sprites
{
    public class Sprite
    {
        private readonly SKPaint paint;

        public Sprite(SpriteSheet sheet, string name, SKSize size, SKRect bounds)
        {
            Name = name;
            SpriteSheet = sheet;
            Size = size;
            SourceBounds = bounds;

            paint = new SKPaint();
        }

        public string Name { get; private set; }

        public SpriteSheet SpriteSheet { get; private set; }

        public SKRect SourceBounds { get; private set; }

        public SKSize Size { get; private set; }

        public SKBitmap Bitmap => SpriteSheet.Bitmap;

        public void Draw(SKCanvas canvas, float x, float y)
        {
            Draw(canvas, x, y, null);
        }

        public void Draw(SKCanvas canvas, float x, float y, byte opacity = 255)
        {
            using (var cf = SKColorFilter.CreateXferMode(SKColors.White.WithAlpha(opacity), SKXferMode.DstIn))
            {
                paint.ColorFilter = cf;
                Draw(canvas, x, y, paint);
                paint.ColorFilter = null;
            }
        }

        public void Draw(SKCanvas canvas, float x, float y, SKPaint paint = null)
        {
            canvas.DrawBitmap(Bitmap, SourceBounds, SKRect.Create(x, y, Size.Width, Size.Height), paint);
        }
    }
}
