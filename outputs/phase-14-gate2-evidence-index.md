# Phase 14 Gate 2 private evidence index

This index records hashes and byte sizes for owner-authorized, sanitized production read-only evidence. The actual artifacts remain ignored under `.private/`; none of their row-level content is tracked, attached to the PR, or uploaded to CI.

| Private artifact | Bytes | SHA-256 | Tracked content |
| --- | ---: | --- | --- |
| authorization artifact | 1,254 | `ba5b4591503d5b789441269d9ae9ef43d9acbdc40bc9c6fb8073644bdd7774ca` | no |
| sanitized bucket metadata | 614 | `48684311f07037b31dd2dbd8f6db7016cb44b1cd4af9fa47f85c6c5967fccdfb` | no |
| raw sanitized inventory | 473,415 | `345db36fda912e89fb65282ef2d89c4eb9d1a989207edfe401cfdbb238a6ed65` | no |
| normalized inventory v1 | 473,415 | `345db36fda912e89fb65282ef2d89c4eb9d1a989207edfe401cfdbb238a6ed65` | no |
| Phase 13 reconciliation baseline adapter | 559,934 | `74f27228f9534e7d29111d9e038372b1ba4b8613c3a1f9601477b9ed17675d58` | no |
| row-level reconciliation CSV | 409,973 | `bef35bafce931e6d163a2a649830aef1c80e858c92ac807a9088d3c3c72d16d4` | no |
| count-domain reconciliation | 2,608 | `35e0681067d2ed29eb6bbea7c14350707dafc6fe08f0f7e220e1cb09d66aba54` | no |
| collection summary | 129,301 | `008efa3f1d3189a45117bd72105d4da4422810e584657be9d43c27412dd9fae5` | no |

Validation result: authorization schema valid, production inventory schema valid, secret findings 0, URL findings 0, three normalized hashes identical, and three reconciliation hashes identical. Credentials, session tokens, private object paths, project URL/ref, signed URLs, and content bodies are not present in this index.
