// Backward-compatible entry point. The authoritative Phase 9 builder requires
// the frozen real Wix snapshot and fails closed when it is absent or unsafe.
await import('./build-real-manifests.mjs')
