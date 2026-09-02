<?php

declare(strict_types=1);

namespace Drupal\hkcec_log_center\Logger;

use Drupal\hkcec_log_center\Service\LogCenterWriter;
use Drupal\Core\Logger\RfcLogLevel;
use Psr\Log\LoggerInterface;
use Psr\Log\LoggerTrait;

/**
 * PSR logger that mirrors Error+ messages into Log Center.
 */
final class LogCenterLogger implements LoggerInterface {

  use LoggerTrait;

  public function __construct(
    private readonly LogCenterWriter $writer,
  ) {}

  /**
   * {@inheritdoc}
   */
  public function log($level, string|\Stringable $message, array $context = []): void {
    $rfc = is_int($level) ? $level : $this->psrToRfc((string) $level);
    // Only Error, Critical, Alert, Emergency.
    if ($rfc > RfcLogLevel::ERROR) {
      return;
    }

    // Avoid recursion if we log from hkcec_log_center channel writes that error.
    $channel = (string) ($context['channel'] ?? ($context['@channel'] ?? 'php'));
    if ($channel === 'hkcec_log_center') {
      return;
    }

    $severity = match ($rfc) {
      RfcLogLevel::EMERGENCY => 'emergency',
      RfcLogLevel::ALERT => 'alert',
      RfcLogLevel::CRITICAL => 'critical',
      default => 'error',
    };

    $text = (string) $message;
    // Replace placeholders similar to Drupal logger.
    foreach ($context as $key => $value) {
      if (is_scalar($value) || $value === NULL) {
        $text = str_replace('{' . $key . '}', (string) $value, $text);
        $text = str_replace('@' . $key, (string) $value, $text);
        $text = str_replace('%' . $key, (string) $value, $text);
      }
    }

    $safe_context = $context;
    unset($safe_context['exception'], $safe_context['backtrace']);

    try {
      $this->writer->error(mb_substr($text, 0, 2000), [
        'severity' => $severity,
        'channel' => is_string($channel) ? $channel : 'php',
        'context' => $safe_context,
      ]);
    }
    catch (\Throwable) {
      // Never break the site if logging fails.
    }
  }

  private function psrToRfc(string $level): int {
    return match (strtolower($level)) {
      'emergency' => RfcLogLevel::EMERGENCY,
      'alert' => RfcLogLevel::ALERT,
      'critical' => RfcLogLevel::CRITICAL,
      'error' => RfcLogLevel::ERROR,
      'warning' => RfcLogLevel::WARNING,
      'notice' => RfcLogLevel::NOTICE,
      'info' => RfcLogLevel::INFO,
      default => RfcLogLevel::DEBUG,
    };
  }

}
