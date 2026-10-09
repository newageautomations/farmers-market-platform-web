import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
export default class CheckoutReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    console.log(`${result.status}: ${test.title}`);
    for (const error of result.errors)
      console.log(
        (error.message ?? 'Test failed').replace(
          /([?&](?:token|code|correlation)=)[^\s&"<>]+/g,
          '$1[redacted]',
        ),
      );
  }
  onStdOut(chunk: string | Buffer) {
    console.log(
      String(chunk).replace(
        /([?&](?:token|code|correlation)=)[^\s&"<>]+/g,
        '$1[redacted]',
      ),
    );
  }
  onEnd(result: FullResult) {
    console.log(`Checkout/account browser result: ${result.status}`);
  }
}
