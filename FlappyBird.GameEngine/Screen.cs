using SkiaSharp;
using System;

namespace FlappyBird.GameEngine
{
	public class Screen
	{
		public Screen(Game game, SpriteSheet spriteSheet)
		{
			Game = game;
			SpriteSheet = spriteSheet;
		}

		public Game Game { get; }

		public SpriteSheet SpriteSheet { get; }

		public virtual void TouchDown(SKPointI point)
		{
		}

		public virtual void TouchUp(SKPointI point)
		{
		}

		public virtual void Update(TimeSpan dt)
		{
		}

		public virtual void Draw(SKCanvas canvas)
		{
		}

		public virtual void Tap(SKPointI point)
		{
		}

		public virtual void Resize(int width, int height)
		{
		}

		public virtual void Start()
		{
		}
	}
}
