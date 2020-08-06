using System;
using SkiaSharp;
using SkiaSharp.Views.UWP;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Navigation;

namespace FlappyBird.Wasm
{
	public sealed partial class MainPage : Page
	{
		private readonly FlappyBirdGame game;
		private readonly SKSizeI baseSize;

		private int milliseconds = 0;

		private float scale = 1;
		private SKPoint offset = SKPoint.Empty;

		public MainPage()
		{
			InitializeComponent();

			game = new FlappyBirdGame();
			baseSize = new SKSizeI(288, 512);

			SizeChanged += OnSizeChanged;

			_ = game.LoadContentAsync();
		}

		protected override void OnNavigatedTo(NavigationEventArgs e)
		{
			base.OnNavigatedTo(e);

			game.Resize(baseSize.Width, baseSize.Height);

			milliseconds = Environment.TickCount;

			gameSurface.Invalidate();

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
			canvas.Clear(SKColors.Black);

			using var save = new SKAutoCanvasRestore(canvas, true);

			scale = Math.Min(
				(float)e.BackendRenderTarget.Width / baseSize.Width,
				(float)e.BackendRenderTarget.Height / baseSize.Height);

			var screenRect = (SKRect)e.BackendRenderTarget.Rect;
			var centeredRect = screenRect.AspectFit(baseSize);

			offset = centeredRect.Location;

			canvas.Translate(offset);
			canvas.Scale(scale);

			canvas.ClipRect(SKRect.Create(baseSize));

			game.Draw(canvas);
		}

		private SKPointI GetLocation(PointerRoutedEventArgs e)
		{
			var pos = e.GetCurrentPoint(gameSurface).Position;

			pos.X *= gameSurface.ContentsScale;
			pos.Y *= gameSurface.ContentsScale;

			var x = (pos.X - offset.X) / scale;
			var y = (pos.Y - offset.Y) / scale;

			return new SKPointI((int)x, (int)y);
		}

		private void OnPointerPressed(object sender, PointerRoutedEventArgs e)
		{
			var pos = GetLocation(e);

			game.TouchDown(pos);

			e.Handled = true;
		}

		private void OnPointerMoved(object sender, PointerRoutedEventArgs e)
		{
		}

		private void OnPointerReleased(object sender, PointerRoutedEventArgs e)
		{
			var pos = GetLocation(e);

			game.TouchUp(pos);
			game.Tap(pos);

			e.Handled = true;
		}

		private void OnPointerExited(object sender, PointerRoutedEventArgs e)
		{
		}

		private void OnPointerCanceled(object sender, PointerRoutedEventArgs e)
		{
		}
	}
}
