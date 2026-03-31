export function Dashboard() {
  const activeLaunches = [
    { ticker: 'PEPECEO', mc: '$45K', status: 'bonding curve', replies: 42 },
    { ticker: 'DOGE2', mc: '$12K', status: 'bonding curve', replies: 12 },
    { ticker: 'RUGPULL', mc: '$0', status: 'rugged', replies: 999 },
  ];

  return (
    <div className="w-full font-mono max-w-4xl mx-auto">
      <div className="mb-8 flex justify-between items-end border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-green-400">[creator dashboard]</h1>
          <p className="text-zinc-500 text-xs mt-1">manage your degenerate creations.</p>
        </div>
        <button className="bg-green-500 text-black px-4 py-2 text-sm font-bold hover:bg-green-400 transition-colors">
          [start a new coin]
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="border border-zinc-800 bg-[#1a1a1a] p-4">
          <div className="text-zinc-500 text-xs mb-1">[total rugs]</div>
          <div className="text-xl text-green-400 font-bold">0</div>
        </div>
        <div className="border border-zinc-800 bg-[#1a1a1a] p-4">
          <div className="text-zinc-500 text-xs mb-1">[coins launched]</div>
          <div className="text-xl text-green-400 font-bold">3</div>
        </div>
        <div className="border border-zinc-800 bg-[#1a1a1a] p-4">
          <div className="text-zinc-500 text-xs mb-1">[total volume]</div>
          <div className="text-xl text-green-400 font-bold">142 SOL</div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-zinc-300 mb-4">&gt; your_coins.exe</h2>
        <div className="border border-zinc-800 bg-[#1a1a1a] overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="p-3 font-normal">[ticker]</th>
                <th className="p-3 font-normal">[market_cap]</th>
                <th className="p-3 font-normal">[status]</th>
                <th className="p-3 font-normal">[replies]</th>
                <th className="p-3 font-normal text-right">[action]</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {activeLaunches.map((launch, i) => (
                <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="p-3 font-bold text-green-400">{launch.ticker}</td>
                  <td className="p-3 text-zinc-300">{launch.mc}</td>
                  <td className="p-3">
                    <span className={`text-xs ${launch.status === 'rugged' ? 'text-red-500' : 'text-blue-400'}`}>
                      {launch.status}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-400">{launch.replies}</td>
                  <td className="p-3 text-right">
                    <button className="text-xs border border-zinc-700 px-2 py-1 hover:border-green-400 hover:text-green-400 transition-colors">
                      [manage]
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
