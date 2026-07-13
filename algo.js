/*
 * algo.js
 *
 * HUMAN-SHAPED TACTICAL PATTERN LIBRARY
 * =====================================
 *
 * This file contains small rules that pattern-match against predicates.
 *
 * A rule has this shape:
 *
 * {
 *   id: "rule_name",
 *
 *   // When these predicates are present, the rule becomes relevant.
 *   when: [...],
 *
 *   // Optional human-facing hint.
 *   hint: "...",
 *
 *   // Which candidate moves should receive special attention.
 *   candidates: [...],
 *
 *   // Which enemy replies should be examined after choosing a candidate.
 *   replies: [...],
 *
 *   // Stop this rule after the enemy reply and scan all rules again.
 *   then: "rescan"
 * }
 *
 *
 * PREDICATES
 * ----------
 *
 * Predicates are simple facts:
 *
 *   loose(piece)
 *   hanging(piece)
 *   pinned(piece, pinnedTo)
 *   attacks(attacker, target)
 *   defends(defender, target)
 *   check(side)
 *   mate_threat(side)
 *
 * Predicates may also compare a candidate position with the current position:
 *
 *   adds_attacker(candidate, target)
 *   removes_defender(candidate, target)
 *   creates_check(candidate)
 *   creates_mate_threat(candidate)
 *
 *
 * DEPTH
 * -----
 *
 * Rules may limit how far the engine searches while testing candidates:
 *
 *   depth: {
 *     candidatePlies: 1,
 *     replyPlies: 1
 *   }
 *
 * candidatePlies:
 *   How deeply to examine our candidate before deciding whether it matches.
 *
 * replyPlies:
 *   How deeply to examine each enemy reply before performing a fresh scan.
 *
 *
 * CANDIDATE CONSTRAINTS
 * ---------------------
 *
 * Candidate constraints keep the search human-sized.
 *
 *   candidateConstraints: {
 *     maximum: 3,
 *     requireAny: [...],
 *     prefer: [...],
 *     exclude: [...]
 *   }
 *
 * "requireAny" determines which moves qualify.
 * "prefer" orders qualifying moves.
 * "exclude" removes moves that should not be considered.
 *
 *
 * REPLY CONSTRAINTS
 * -----------------
 *
 * Reply constraints determine which enemy replies matter.
 *
 * Replies may be retained because they:
 *
 *   - preserve the feature we are trying to exploit;
 *   - answer our threat;
 *   - give check;
 *   - create a mate threat;
 *   - create some other higher-order threat.
 *
 * Replies outside the retained classes are provisionally ignored.
 *
 *
 * EXECUTION MODEL
 * ---------------
 *
 *   1. Scan the current position for predicates.
 *   2. Activate every matching rule.
 *   3. Show the rule's hint to the human.
 *   4. Mark candidate moves matching its candidate constraints.
 *   5. The human or engine selects a candidate.
 *   6. Generate only the relevant enemy reply classes.
 *   7. After an enemy reply, stop the current rule.
 *   8. Recalculate predicates and scan the whole rule library again.
 */

(function (root, factory) {
  var algo = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = algo;
  }

  root.ALGO = algo;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  var ALGO = {
    version: "0.2.0",

    objective: {
      materialAdvantagePawns: 2,
      opponentMayHaveThreat: false
    },

    /*
     * These are names understood by the tactical predicate engine.
     *
     * algo.js does not calculate them. It only pattern-matches against them.
     */
    predicates: [
      "loose",
      "hanging",
      "pinned",
      "attacks",
      "defends",
      "check",
      "mate_threat",

      /*
       * Candidate-relative predicates.
       */
      "adds_attacker",
      "removes_defender",
      "captures",
      "creates_check",
      "creates_mate_threat",
      "creates_higher_order_threat",

      /*
       * Reply-relative predicates.
       */
      "still_defends",
      "answers_threat",
      "gives_check",
      "creates_threat"
    ],

    rules: [
      {
        id: "loose_piece",

        /*
         * Enter this rule whenever an enemy loose piece exists.
         *
         * "$loosePiece" binds to the matching piece.
         */
        when: [
          {
            predicate: "loose",
            args: {
              piece: "$loosePiece",
              side: "enemy"
            }
          }
        ],

        hint: "I see a loose piece. Can I capture or harass its defender?",

        depth: {
          /*
           * Examine only the immediate result of each candidate.
           */
          candidatePlies: 1,

          /*
           * Examine the enemy's immediate reply, then rescan.
           */
          replyPlies: 1
        },

        candidateConstraints: {
          /*
           * Do not overwhelm the human with a large move list.
           */
          maximum: 3,

          /*
           * A move is marked as a candidate if it satisfies at least one
           * of these patterns.
           */
          requireAny: [
            {
              predicate: "captures",
              args: {
                candidate: "$candidate",
                target: "$loosePiece"
              }
            },

            {
              /*
               * Bind every current defender of the loose piece, then find
               * candidates that add an attacker to one of those defenders.
               */
              all: [
                {
                  predicate: "defends",
                  args: {
                    defender: "$defender",
                    target: "$loosePiece"
                  }
                },

                {
                  predicate: "adds_attacker",
                  args: {
                    candidate: "$candidate",
                    target: "$defender",
                    minimumAdded: 1
                  }
                }
              ]
            },

            {
              all: [
                {
                  predicate: "defends",
                  args: {
                    defender: "$defender",
                    target: "$loosePiece"
                  }
                },

                {
                  predicate: "captures",
                  args: {
                    candidate: "$candidate",
                    target: "$defender"
                  }
                }
              ]
            },

            {
              all: [
                {
                  predicate: "defends",
                  args: {
                    defender: "$defender",
                    target: "$loosePiece"
                  }
                },

                {
                  predicate: "removes_defender",
                  args: {
                    candidate: "$candidate",
                    defender: "$defender",
                    target: "$loosePiece"
                  }
                }
              ]
            }
          ],

          /*
           * Qualifying moves are ordered using these patterns.
           */
          prefer: [
            {
              predicate: "captures",
              args: {
                candidate: "$candidate",
                target: "$loosePiece"
              }
            },

            {
              predicate: "creates_check",
              args: {
                candidate: "$candidate"
              }
            },

            {
              all: [
                {
                  predicate: "defends",
                  args: {
                    defender: "$defender",
                    target: "$loosePiece"
                  }
                },

                {
                  predicate: "adds_attacker",
                  args: {
                    candidate: "$candidate",
                    target: "$defender",
                    minimumAdded: 1
                  }
                }
              ]
            }
          ],

          exclude: []
        },

        /*
         * Information displayed beside a marked candidate.
         */
        candidateMarker: {
          label: "Loose-piece idea",

          explain: [
            "This move acts against a loose piece or its defender.",

            {
              when: {
                predicate: "adds_attacker",
                args: {
                  candidate: "$candidate",
                  target: "$defender"
                }
              },

              text:
                "This move adds an attacker to the defender of the loose piece."
            },

            {
              when: {
                predicate: "captures",
                args: {
                  candidate: "$candidate",
                  target: "$defender"
                }
              },

              text: "This move captures the defender of the loose piece."
            },

            {
              when: {
                predicate: "captures",
                args: {
                  candidate: "$candidate",
                  target: "$loosePiece"
                }
              },

              text: "This move captures the loose piece directly."
            }
          ]
        },

        /*
         * After a candidate is selected, retain only enemy replies matching
         * one of these classes.
         */
        replyConstraints: {
          maximumPerClass: 5,

          retainAny: [
            {
              id: "still_protects_loose_piece",

              label: "Still protects loose piece",

              all: [
                {
                  predicate: "still_defends",
                  args: {
                    reply: "$reply",
                    defender: "$defender",
                    target: "$loosePiece"
                  }
                }
              ]
            },

            {
              id: "answers_our_threat",

              label: "Answers threat",

              predicate: "answers_threat",

              args: {
                reply: "$reply",
                threatCreatedBy: "$candidate"
              }
            },

            {
              id: "check",

              label: "Check",

              predicate: "gives_check",

              args: {
                reply: "$reply",
                side: "enemy"
              }
            },

            {
              id: "mate_threat",

              label: "Mate threat",

              predicate: "creates_mate_threat",

              args: {
                candidate: "$reply",
                side: "enemy"
              }
            },

            {
              id: "higher_order_threat",

              label: "Higher-order threat",

              predicate: "creates_higher_order_threat",

              args: {
                candidate: "$reply",
                side: "enemy"
              }
            }
          ],

          ignoreRestBecause:
            "Replies that neither preserve the loose piece, answer our threat, " +
            "nor create a higher-order threat do not address the tactical idea."
        },

        /*
         * Do not prescribe the rest of the solution.
         *
         * After one retained enemy reply is played, calculate the new
         * predicates and begin another complete rule scan.
         */
        then: "rescan"
      }
    ]
  };

  return ALGO;
});
