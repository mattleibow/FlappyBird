using System;

namespace FlappyBird.GameEngine
{
	public class FrameCounter
	{
		private readonly int sampleCount;
		private int index;
		private int sum;
		private readonly int[] samples;

		private int lastTick;

		public FrameCounter(int sampleCount = 100)
		{
			this.sampleCount = sampleCount;
			lastTick = Environment.TickCount;
			samples = new int[sampleCount];
		}

		public float Rate { get; private set; }

		public TimeSpan Duration { get; private set; }

		public void Restart()
		{
			lastTick = Environment.TickCount;
			NextFrame();
		}

		public float NextFrame()
		{
			var ticks = Environment.TickCount;
			var delta = ticks - lastTick;
			lastTick = ticks;

			Rate = 1000f / CalculateAverage(delta);
			Duration = TimeSpan.FromMilliseconds(delta);

			return delta;
		}

		private float CalculateAverage(int delta)
		{
			sum -= samples[index];
			sum += delta;
			samples[index] = delta;

			if (++index == sampleCount)
				index = 0;

			return (float)sum / sampleCount;
		}
	}
}
