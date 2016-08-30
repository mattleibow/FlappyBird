using System;
using System.Drawing;
using System.Windows.Forms;
using SkiaSharp;
using System.Diagnostics;

namespace FlappyBird.Desktop
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            Application.Run(new FlappyBirdForm());
        }

        private class FlappyBirdForm : Form
        {
            private readonly FlappyBirdControl flappyBirdControl;
            private readonly FlappyBirdGame game;

            public FlappyBirdForm()
            {
                SuspendLayout();

                var dpiX = 1f;
                var dpiY = 1f;
                using (var g = CreateGraphics())
                {
                    dpiX = g.DpiX / 96f;
                    dpiY = g.DpiY / 96f;
                }

                // Game
                game = new FlappyBirdGame();

                // Form
                AutoScaleDimensions = new SizeF(192F, 192F);
                AutoScaleMode = AutoScaleMode.Dpi;
                ClientSize = new Size((int)(288 * dpiX), (int)(512 * dpiY));
                Margin = new Padding(4, 4, 4, 4);
                Text = "FlappyBird";
                FormBorderStyle = FormBorderStyle.FixedSingle;
                MaximizeBox = false;

                // View
                flappyBirdControl = new FlappyBirdControl(game, new SKPoint(dpiX, dpiY));
                flappyBirdControl.Dock = DockStyle.Fill;
                Controls.Add(flappyBirdControl);

                ResumeLayout(false);
            }

            protected override async void OnLoad(EventArgs e)
            {
                base.OnLoad(e);

                await game.LoadContentAsync();

                flappyBirdControl.Start();
            }
        }

        private class FlappyBirdControl : SkiaControl
        {
            private readonly FlappyBirdGame game;
            private readonly SKPoint scaling;

            private bool enabled;
            private int milliseconds = 0;

            public FlappyBirdControl(FlappyBirdGame game, SKPoint scaling)
            {
                this.game = game;
                this.scaling = scaling;
            }

            public void Start()
            {
                ResizeGame();

                milliseconds = Environment.TickCount;
                enabled = true;
                Invalidate();

                game.Start();
            }

            protected override void OnMouseClick(MouseEventArgs e)
            {
                base.OnMouseClick(e);

                if (!enabled)
                {
                    return;
                }

                game.Tap(new SKPointI((int)(e.X / scaling.X), (int)(e.Y / scaling.Y)));
            }

            protected override void OnClientSizeChanged(EventArgs e)
            {
                base.OnClientSizeChanged(e);

                ResizeGame();
            }

            protected override void OnDraw(SKCanvas canvas)
            {
                if (!enabled)
                {
                    return;
                }

                if (Environment.TickCount - milliseconds == 0) { Invalidate(); return; }

                var oldTicks = milliseconds;
                var newTicks = Environment.TickCount;
                milliseconds = newTicks;

                game.Update(TimeSpan.FromMilliseconds(newTicks - oldTicks));

                using (new SKAutoCanvasRestore(canvas, true))
                {
                    canvas.Scale(scaling);

                    game.Draw(canvas);
                }

                Invalidate();
            }

            private void ResizeGame()
            {
                game.Resize((int)(Width / scaling.X), (int)(Height / scaling.Y));
            }
        }
    }
}
