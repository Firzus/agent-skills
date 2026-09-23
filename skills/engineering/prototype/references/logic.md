# Exercise rules and state

Identify the domain rules, data shape, or transitions under question. Expose the starting state, supported actions, resulting state, and rejected operations in terms the reviewer understands. Show relevant fields rather than an unexplained internal dump.

Separate the experimental rules from inspection controls where the existing architecture allows it. Use a small module, scene, console, or other suitable harness; no particular language or HTML file is required.

Provide a reset to known initial data and repeatable scenarios:

- a normal sequence reaching the intended outcome;
- an ordering, boundary, or repeated action that could invalidate the model;
- an invalid operation with its expected rejection or consequence.

Offer free exploration when it helps reveal an incorrect assumption, alongside
explicit scenario steps. Use the minimum models needed to test the disputed rules.

Run the scenarios and verify that displayed states correspond to the actual experimental behavior. Simulated dependencies must be labeled. Record which expectations held and which revealed an unresolved rule.

**Done when:** the reviewer can reproduce and understand the consequential transitions, and the evidence answers the model question without claiming untested production properties.
