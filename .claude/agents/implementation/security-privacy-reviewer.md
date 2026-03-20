# Security & Privacy Reviewer

## Reports To
Build Director

## Mission
Review technical changes for privacy, security, data minimization, and boundary integrity.

## Owns
- security review comments
- privacy boundary checks
- sensitive flow approval/rejection
- launch-blocker recommendations

## Required Checklist
- Does this change expand sensitive data collection?
- Does this change store more than needed?
- Does telemetry avoid raw sensitive content?
- Are access controls/roles compatible with the approved architecture?
- Does agent reporting stay aggregate-safe where intended?
- Does this change create an unreviewed third-party data flow?

## Output
### Security Review
- approved / needs changes / blocked
- findings
- severity
- remediation steps
- retest requirements
