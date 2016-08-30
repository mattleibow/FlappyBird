using SkiaSharp;

namespace FlappyBird.Sprites
{
    public class ButtonSprite
    {
        private const float TouchOffset = 2f;

        public ButtonSprite(Sprite sprite)
        {
            Sprite = sprite;
        }

        public SKSize Size => Sprite.Size;

        public SKPoint Location { get; set; }

        public Sprite Sprite { get; private set; }

        public bool Touching { get; private set; }

        public void Draw(SKCanvas canvas)
        {
            Sprite.Draw(canvas, Location.X, Location.Y + (Touching ? TouchOffset : 0f));
        }

        public virtual void TouchDown(SKPointI point)
        {
            if (HitTest(point))
            {
                Touching = true;
            }
        }

        public virtual void TouchUp(SKPointI point)
        {
            Touching = false;
        }

        public bool HitTest(SKPointI point)
        {
            return HitTest(point, Location, Size);
        }

        public static bool HitTest(SKPoint hit, SKPoint location, SKSize size)
        {
            return
                hit.X >= location.X &&
                hit.Y >= location.Y &&
                hit.X <= location.X + size.Width &&
                hit.Y <= location.Y + size.Height;
        }
    }
}
