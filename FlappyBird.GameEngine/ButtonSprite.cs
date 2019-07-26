using SkiaSharp;

namespace FlappyBird.GameEngine
{
	public class ButtonSprite
	{
		private const float TouchOffset = 2f;

		public ButtonSprite(Sprite sprite)
		{
			Sprite = sprite;
		}

		public Sprite Sprite { get; }

		public bool IsPressed { get; private set; }

		public SKSize Size => Sprite.Size;

		public SKPoint Location { get; set; }

		public SKRect Bounds => SKRect.Create(Location, Sprite.Size);

		public void Draw(SKCanvas canvas)
		{
			Sprite.Draw(canvas, Location.X, Location.Y + (IsPressed ? TouchOffset : 0f));
		}

		public virtual void TouchDown(SKPointI point)
		{
			IsPressed = HitTest(point);
		}

		public virtual void TouchUp(SKPointI point)
		{
			IsPressed = false;
		}

		public bool HitTest(SKPointI point) =>
			Bounds.Contains(point);
	}
}
