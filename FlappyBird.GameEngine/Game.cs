using System;
using System.Threading.Tasks;
using SkiaSharp;

namespace FlappyBird.GameEngine
{
	public abstract class Game
	{
		private const float FadeSpeed = 0.5f; // seconds

		// transition
		private readonly SKPaint fadePaint;
		private float fadeProgress;
		private Screen? currentScreen;
		private Screen? transitionScreen;

		private SKPaint fpsPaint;
		private readonly FrameCounter counter;

		public Game()
		{
			fadePaint = new SKPaint
			{
				Color = SKColors.Transparent
			};
			fpsPaint = new SKPaint
			{
				Color = SKColors.Black,
				IsAntialias = true,
				TextSize = 12
			};
			counter = new FrameCounter();

#if DEBUG
			DrawFrameRate = true;
#endif
		}

		public SKSize DisplaySize { get; private set; }

		public bool DrawFrameRate { get; set; }

		public bool Transitioning => TransitionScreen != null;

		public Screen? CurrentScreen
		{
			get => currentScreen;
			set
			{
				currentScreen = value;
				currentScreen?.Resize((int)DisplaySize.Width, (int)DisplaySize.Height);
			}
		}

		public Screen? TransitionScreen
		{
			get => transitionScreen;
			private set
			{
				transitionScreen = value;
				transitionScreen?.Resize((int)DisplaySize.Width, (int)DisplaySize.Height);
			}
		}

		protected void TransisionTo(Screen screen)
		{
			TransitionScreen = screen;

			fadeProgress = 0;
			TransitionScreen = screen;
		}

		public virtual Task LoadContentAsync()
		{
			return Task.FromResult(true);
		}

		public virtual void Resize(int width, int height)
		{
			DisplaySize = new SKSize(width, height);

			// make sure all the visible screens are resized correctly
			CurrentScreen?.Resize(width, height);
			TransitionScreen?.Resize(width, height);
		}

		public void Update()
		{
			counter.NextFrame();

			Update(counter.Duration);
		}

		public virtual void Update(TimeSpan dt)
		{
			// update the current screen
			CurrentScreen?.Update(dt);

			if (!Transitioning)
				return;

			// update the fade transition
			var step = (float)dt.TotalSeconds / FadeSpeed;
			if (CurrentScreen != TransitionScreen && CurrentScreen != null)
			{
				// fade to black
				fadeProgress += step;
				if (fadeProgress >= 1)
				{
					fadeProgress = 1;
					CurrentScreen = TransitionScreen;
					TransitionScreen?.Start();
				}
			}
			else
			{
				// fade next screen in
				fadeProgress -= step;
				if (fadeProgress <= 0)
					TransitionScreen = null;
			}
		}

		public virtual void Start()
		{
			counter.Restart();

			CurrentScreen?.Start();
		}

		public virtual void Draw(SKCanvas canvas)
		{
			CurrentScreen?.Draw(canvas);

			// draw the black over the screen
			if (Transitioning)
			{
				fadePaint.Color = SKColors.Black.WithAlpha((byte)(fadeProgress * byte.MaxValue));
				canvas.DrawRect(SKRect.Create(DisplaySize.Width, DisplaySize.Height), fadePaint);
			}

			if (DrawFrameRate)
			{
				canvas.DrawText($"FPS: {counter.Rate:0.0}", 5, fpsPaint.TextSize + 5, fpsPaint);
			}
		}

		public virtual void Tap(SKPointI point)
		{
			// interaction only when not transitioning
			if (!Transitioning)
				CurrentScreen?.Tap(point);
		}

		public virtual void TouchDown(SKPointI point)
		{
			// interaction only when not transitioning
			if (!Transitioning)
				CurrentScreen?.TouchDown(point);
		}

		public virtual void TouchUp(SKPointI point)
		{
			// interaction only when not transitioning
			if (!Transitioning)
				CurrentScreen?.TouchUp(point);
		}
	}
}
