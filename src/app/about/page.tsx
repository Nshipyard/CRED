export const metadata = { title: 'About CRED' };

export default function About() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-[#0a0f1e]">About CRED</h1>

      <section className="mt-6">
        <h2 className="text-xl font-bold text-[#0a0f1e]">What is CRED</h2>
        <p className="mt-2 text-gray-700">
          CRED is a Canadian version of FRED (Federal Reserve Economic Data):
          one search box across Statistics Canada and the Bank of Canada, one
          chart interaction language (zoom, ranges, download, share image), and
          a public API. Statistics Canada publishes over 5,000 data cubes as
          vectors, not named series, so the missing piece is not the data, it
          is packaging: curated titles, consistent units, and recession shading
          from the C.D. Howe Institute on every chart.
        </p>
      </section>

      <section className="mt-8" id="sources">
        <h2 className="text-xl font-bold text-[#0a0f1e]">Sources</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border hairline">
          <table className="w-full text-sm">
            <thead className="bg-[#f7f7f7] text-left">
              <tr>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Coverage</th>
                <th className="px-4 py-2">Update cadence</th>
                <th className="px-4 py-2">Licence</th>
                <th className="px-4 py-2">Role in v1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(10,15,30,0.1)]">
              <tr>
                <td className="px-4 py-3 font-medium">Statistics Canada Web Data Service</td>
                <td className="px-4 py-3">LFS, CPI, GDP, trade, retail, 5,000+ cubes</td>
                <td className="px-4 py-3">Monthly/quarterly, daily delta file</td>
                <td className="px-4 py-3">Statistics Canada Open Licence: reuse and republish with attribution</td>
                <td className="px-4 py-3">Core: about 85% of v1 series</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Bank of Canada Valet API</td>
                <td className="px-4 py-3">Policy rate, bond yields, daily FX, monetary aggregates</td>
                <td className="px-4 py-3">Daily</td>
                <td className="px-4 py-3">Free reuse with attribution</td>
                <td className="px-4 py-3">Rates and markets</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">C.D. Howe Institute Business Cycle Council</td>
                <td className="px-4 py-3">Canadian recession peak/trough dates (1929+)</td>
                <td className="px-4 py-3">Per cycle</td>
                <td className="px-4 py-3">Public, cite with attribution</td>
                <td className="px-4 py-3">Recession shading on every chart</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          CRED is never sourced from FRED itself: FRED's terms forbid building a
          competing product on its data.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-[#0a0f1e]">Tutorials</h2>
        <p className="mt-2 text-gray-700">
          Tutorials ship with Phase 1, alongside the CRED news desk. The first
          three will cover: reading the yield curve with the 10-year GoC spread,
          comparing provincial unemployment rates, and downloading vintages
          from the API.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-[#0a0f1e]">Digital Badges</h2>
        <p className="mt-2 text-gray-700">
          Saved graphs and embeddable badges need user accounts. Accounts are
          not in v1, so badges ship later; nothing is half-built here.
        </p>
      </section>

      <section className="mt-8" id="naming">
        <h2 className="text-xl font-bold text-[#0a0f1e]">Naming</h2>
        <p className="mt-2 text-gray-700">
          Working title: CRED (Canadian Research Economic Data). Alternatives
          under consideration: GORD (Graphing Open Real-time Data), HOWE (after
          C.D. Howe), MAPLE, REDD. The product concept matters more than the
          name; one will be picked before launch.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-[#0a0f1e]">Contact</h2>
        <p className="mt-2 text-gray-700">
          Bug reports and series requests go to the GitHub issue tracker:{' '}
          <a
            href="https://github.com/Nshipyard/CRED/issues"
            className="text-[#d80621] hover:underline"
          >
            github.com/Nshipyard/CRED/issues
          </a>
          . There is no support email address yet.
        </p>
      </section>
    </div>
  );
}
