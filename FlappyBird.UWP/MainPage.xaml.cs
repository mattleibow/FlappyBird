using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;
using SkiaSharp;
using Windows.Graphics.Display;
using Windows.UI.Core;

namespace FlappyBird.UWP
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class MainPage : Page
    {
        private readonly FlappyBirdControl flappyBirdControl;
        private readonly Game game;

        public MainPage()
        {
            this.InitializeComponent();

            // Game
            game = new Game();

            // View
            flappyBirdControl = new FlappyBirdControl(game, new SKSizeI(288, 512));
            flappyBirdControl.SetValue(Grid.HorizontalAlignmentProperty, HorizontalAlignment.Stretch);
            flappyBirdControl.SetValue(Grid.VerticalAlignmentProperty, VerticalAlignment.Stretch);
            RootLayout.Children.Add(flappyBirdControl);

            Loaded += OnLoad;
        }

        private async void OnLoad(object sender, RoutedEventArgs e)
        {
            await game.LoadContentAsync();

            flappyBirdControl.Start();
        }

        private class FlappyBirdControl : SkiaControl
        {
            private readonly Game game;
            private readonly SKSizeI baseSize;
            private readonly DispatcherTimer timer;

            private int milliseconds = 0;

            public FlappyBirdControl(Game game, SKSizeI baseSize)
            {
                this.game = game;
                this.baseSize = baseSize;

                this.timer = new DispatcherTimer();
                this.timer.Interval = TimeSpan.FromMilliseconds(1000 / 60);
                this.timer.Tick += delegate { Invalidate(); };
            }

            public void Start()
            {
                ResizeGame();

                milliseconds = Environment.TickCount;
                timer.Start();
                Invalidate();

                game.Start();
            }

            protected override void OnTapped(object sender, TappedRoutedEventArgs e)
            {
                base.OnTapped(sender, e);

                if (!timer.IsEnabled)
                {
                    return;
                }

                var pos = e.GetPosition(this);
                var x = (int)(pos.X / PixelWidth * baseSize.Width);
                var y = (int)(pos.Y / PixelHeight * baseSize.Height);
                game.Tap(new SKPointI(x, y));
            }

            protected override void OnSizeChanged(object sender, SizeChangedEventArgs e)
            {
                base.OnSizeChanged(sender, e);

                ResizeGame();
            }

            protected override void OnDraw(SKCanvas canvas)
            {
                if (!timer.IsEnabled)
                {
                    return;
                }

                var oldTicks = milliseconds;
                var newTicks = Environment.TickCount;
                milliseconds = newTicks;

                game.Update(TimeSpan.FromMilliseconds(newTicks - oldTicks));

                using (new SKAutoCanvasRestore(canvas, true))
                {
                    canvas.Scale((float)(ActualWidth / baseSize.Width), (float)(ActualHeight / baseSize.Height));

                    game.Draw(canvas);
                }
            }

            private void ResizeGame()
            {
                game.Resize(baseSize.Width, baseSize.Height);
            }
        }
    }
}
