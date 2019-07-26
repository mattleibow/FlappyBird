using System;
using SkiaSharp;
using SkiaSharp.Views.Forms;
using Xamarin.Forms;

namespace FlappyBird
{
	public partial class MainPage : ContentPage
	{
		private readonly FlappyBirdGame game;
		private readonly SKSizeI baseSize;

		private int milliseconds = 0;

		public MainPage()
		{
			InitializeComponent();

			game = new FlappyBirdGame();
			baseSize = new SKSizeI(288, 512);

			SizeChanged += OnSizeChanged;

			_ = game.LoadContentAsync();
		}

		protected override void OnAppearing()
		{
			base.OnAppearing();

			game.Resize(baseSize.Width, baseSize.Height);

			milliseconds = Environment.TickCount;

			gameSurface.InvalidateSurface();

			game.Start();
		}

		private void OnSizeChanged(object sender, EventArgs e)
		{
			game.Resize(baseSize.Width, baseSize.Height);
		}

		private void OnPaintSurface(object sender, SKPaintGLSurfaceEventArgs e)
		{
			var oldTicks = milliseconds;
			var newTicks = Environment.TickCount;
			milliseconds = newTicks;

			game.Update(TimeSpan.FromMilliseconds(newTicks - oldTicks));

			var canvas = e.Surface.Canvas;
			using (new SKAutoCanvasRestore(canvas, true))
			{
				//canvas.Scale(
				//	e.BackendRenderTarget.Width / baseSize.Width,
				//	e.BackendRenderTarget.Height / baseSize.Height);

				game.Draw(canvas);
			}
		}

		private void OnTouch(object sender, SKTouchEventArgs e)
		{
			var pos = e.Location;
			var x = pos.X; // / gameSurface.CanvasSize.Width * baseSize.Width;
			var y = pos.Y; // / gameSurface.CanvasSize.Height * baseSize.Height;

			if (e.ActionType == SKTouchAction.Pressed)
			{
				game.TouchDown(new SKPointI((int)x, (int)y));
			}
			else if (e.ActionType == SKTouchAction.Released)
			{
				game.TouchUp(new SKPointI((int)x, (int)y));
				game.Tap(new SKPointI((int)x, (int)y));
			}

			e.Handled = true;
		}
	}
}
