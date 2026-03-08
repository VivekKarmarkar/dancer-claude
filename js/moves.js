// Dance move definitions — keyframe-based pose deltas applied on top of the default standing pose.
// Each keyframe pose contains only the joints that move; omitted joints stay at {x:0, y:0} delta.
// All moves start and end at the default pose (empty {} pose) for seamless chaining.
//
// style: 'universal' = works for any genre
//        'western'   = best for pop/EDM/hip-hop
//        'indian'    = best for Bollywood/Marathi/dhol-based music

const MOVES = [

    // =========================================================================
    //  LOW ENERGY
    // =========================================================================

    {
        name: 'headBob',
        style: 'universal',
        energy: 'low',
        durationBeats: 1,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                time: 0.5,
                pose: {
                    head:          { x: 0, y: 12 },
                    neck:          { x: 0, y: 8 },
                    leftShoulder:  { x: 0, y: 6 },
                    rightShoulder: { x: 0, y: 6 },
                    leftElbow:     { x: 0, y: 5 },
                    rightElbow:    { x: 0, y: 5 },
                    leftHand:      { x: 0, y: 4 },
                    rightHand:     { x: 0, y: 4 },
                    hip:           { x: 0, y: 4 },
                    leftKnee:      { x: 3, y: -4 },
                    rightKnee:     { x: -3, y: -4 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'sway',
        style: 'universal',
        energy: 'low',
        durationBeats: 2,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                time: 0.25,
                pose: {
                    head:          { x: -25, y: 0 },
                    neck:          { x: -20, y: 0 },
                    leftShoulder:  { x: -20, y: -2 },
                    rightShoulder: { x: -20, y: 2 },
                    leftElbow:     { x: -18, y: -2 },
                    rightElbow:    { x: -18, y: 2 },
                    leftHand:      { x: -15, y: -2 },
                    rightHand:     { x: -15, y: 2 },
                    hip:           { x: -15, y: 0 },
                    leftKnee:      { x: -6, y: 0 },
                    rightKnee:     { x: -6, y: 0 },
                    leftFoot:      { x: -3, y: 0 },
                    rightFoot:     { x: -3, y: 0 }
                }
            },
            {
                time: 0.75,
                pose: {
                    head:          { x: 25, y: 0 },
                    neck:          { x: 20, y: 0 },
                    leftShoulder:  { x: 20, y: 2 },
                    rightShoulder: { x: 20, y: -2 },
                    leftElbow:     { x: 18, y: 2 },
                    rightElbow:    { x: 18, y: -2 },
                    leftHand:      { x: 15, y: 2 },
                    rightHand:     { x: 15, y: -2 },
                    hip:           { x: 15, y: 0 },
                    leftKnee:      { x: 6, y: 0 },
                    rightKnee:     { x: 6, y: 0 },
                    leftFoot:      { x: 3, y: 0 },
                    rightFoot:     { x: 3, y: 0 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'gentleArmWave',
        style: 'universal',
        energy: 'low',
        durationBeats: 2,
        type: 'arms',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                time: 0.3,
                pose: {
                    rightShoulder: { x: 0, y: -5 },
                    rightElbow:    { x: 15, y: -45 },
                    rightHand:     { x: 30, y: -80 }
                }
            },
            {
                time: 0.6,
                pose: {
                    rightShoulder: { x: 0, y: -5 },
                    rightElbow:    { x: 20, y: -50 },
                    rightHand:     { x: 10, y: -90 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'stepTouch',
        style: 'universal',
        energy: 'low',
        durationBeats: 2,
        type: 'legs',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                time: 0.25,
                pose: {
                    hip:       { x: -15, y: 0 },
                    leftKnee:  { x: -25, y: -5 },
                    rightKnee: { x: -10, y: 5 },
                    leftFoot:  { x: -35, y: 0 },
                    rightFoot: { x: -5, y: 0 }
                }
            },
            {
                time: 0.5,
                pose: {}
            },
            {
                time: 0.75,
                pose: {
                    hip:       { x: 15, y: 0 },
                    leftKnee:  { x: 10, y: 5 },
                    rightKnee: { x: 25, y: -5 },
                    leftFoot:  { x: 5, y: 0 },
                    rightFoot: { x: 35, y: 0 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    // =========================================================================
    //  MID ENERGY
    // =========================================================================

    {
        name: 'clap',
        style: 'universal',
        energy: 'mid',
        durationBeats: 1,
        type: 'arms',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                time: 0.15,
                pose: {
                    leftElbow:  { x: 20, y: -30 },
                    rightElbow: { x: -20, y: -30 },
                    leftHand:   { x: 55, y: -55 },
                    rightHand:  { x: -55, y: -55 }
                }
            },
            {
                time: 0.4,
                pose: {
                    leftShoulder:  { x: 5, y: -3 },
                    rightShoulder: { x: -5, y: -3 },
                    leftElbow:     { x: 30, y: -35 },
                    rightElbow:    { x: -30, y: -35 },
                    leftHand:      { x: 85, y: -65 },
                    rightHand:     { x: -85, y: -65 }
                }
            },
            {
                time: 0.65,
                pose: {
                    leftElbow:  { x: 20, y: -30 },
                    rightElbow: { x: -20, y: -30 },
                    leftHand:   { x: 55, y: -55 },
                    rightHand:  { x: -55, y: -55 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'armPump',
        style: 'western',
        energy: 'mid',
        durationBeats: 1,
        type: 'arms',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                time: 0.35,
                pose: {
                    rightShoulder: { x: 0, y: -5 },
                    rightElbow:    { x: -10, y: -55 },
                    rightHand:     { x: -15, y: -110 }
                }
            },
            {
                time: 0.6,
                pose: {
                    rightShoulder: { x: 0, y: -5 },
                    rightElbow:    { x: -10, y: -55 },
                    rightHand:     { x: -15, y: -110 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'hipShake',
        style: 'universal',
        energy: 'mid',
        durationBeats: 2,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                time: 0.15,
                pose: {
                    head:  { x: -5, y: 0 },
                    neck:  { x: -8, y: 0 },
                    hip:   { x: -22, y: 2 },
                    leftKnee:  { x: -8, y: 3 },
                    rightKnee: { x: -8, y: -3 }
                }
            },
            {
                time: 0.35,
                pose: {
                    head:  { x: 5, y: 0 },
                    neck:  { x: 8, y: 0 },
                    hip:   { x: 22, y: 2 },
                    leftKnee:  { x: 8, y: -3 },
                    rightKnee: { x: 8, y: 3 }
                }
            },
            {
                time: 0.55,
                pose: {
                    head:  { x: -5, y: 0 },
                    neck:  { x: -8, y: 0 },
                    hip:   { x: -22, y: 2 },
                    leftKnee:  { x: -8, y: 3 },
                    rightKnee: { x: -8, y: -3 }
                }
            },
            {
                time: 0.75,
                pose: {
                    head:  { x: 5, y: 0 },
                    neck:  { x: 8, y: 0 },
                    hip:   { x: 22, y: 2 },
                    leftKnee:  { x: 8, y: -3 },
                    rightKnee: { x: 8, y: 3 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'spin',
        style: 'western',
        energy: 'mid',
        durationBeats: 4,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Anticipation — slight crouch
                time: 0.15,
                pose: {
                    head:          { x: 0, y: 6 },
                    neck:          { x: 0, y: 4 },
                    hip:           { x: 0, y: 4 },
                    leftKnee:      { x: 4, y: -3 },
                    rightKnee:     { x: -4, y: -3 }
                }
            },
            {
                // Mid-spin: compress figure (limbs pulled inward, body narrows)
                time: 0.5,
                pose: {
                    head:          { x: 0, y: -8 },
                    neck:          { x: 0, y: -5 },
                    leftShoulder:  { x: 20, y: -5 },
                    rightShoulder: { x: -20, y: -5 },
                    leftElbow:     { x: 40, y: -15 },
                    rightElbow:    { x: -40, y: -15 },
                    leftHand:      { x: 55, y: -25 },
                    rightHand:     { x: -55, y: -25 },
                    hip:           { x: 0, y: -3 },
                    leftKnee:      { x: 15, y: -5 },
                    rightKnee:     { x: -15, y: -5 },
                    leftFoot:      { x: 20, y: -3 },
                    rightFoot:     { x: -20, y: -3 }
                }
            },
            {
                // Coming out of spin
                time: 0.8,
                pose: {
                    head:          { x: 0, y: 4 },
                    neck:          { x: 0, y: 3 },
                    leftShoulder:  { x: 5, y: 0 },
                    rightShoulder: { x: -5, y: 0 },
                    hip:           { x: 0, y: 3 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'point',
        style: 'western',
        energy: 'mid',
        durationBeats: 2,
        type: 'arms',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                time: 0.3,
                pose: {
                    // Right arm points up and out (disco style)
                    rightShoulder: { x: 5, y: -8 },
                    rightElbow:    { x: 30, y: -55 },
                    rightHand:     { x: 55, y: -105 },
                    // Left arm on hip
                    leftElbow:     { x: 15, y: 15 },
                    leftHand:      { x: 40, y: 0 }
                }
            },
            {
                time: 0.65,
                pose: {
                    rightShoulder: { x: 5, y: -8 },
                    rightElbow:    { x: 30, y: -55 },
                    rightHand:     { x: 55, y: -105 },
                    leftElbow:     { x: 15, y: 15 },
                    leftHand:      { x: 40, y: 0 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    // =========================================================================
    //  HIGH ENERGY
    // =========================================================================

    {
        name: 'jump',
        style: 'universal',
        energy: 'high',
        durationBeats: 2,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Crouch down — knees bend, body lowers
                time: 0.25,
                pose: {
                    head:          { x: 0, y: 18 },
                    neck:          { x: 0, y: 15 },
                    leftShoulder:  { x: 0, y: 12 },
                    rightShoulder: { x: 0, y: 12 },
                    leftElbow:     { x: 0, y: 10 },
                    rightElbow:    { x: 0, y: 10 },
                    leftHand:      { x: 0, y: 8 },
                    rightHand:     { x: 0, y: 8 },
                    hip:           { x: 0, y: 14 },
                    leftKnee:      { x: 10, y: 0 },
                    rightKnee:     { x: -10, y: 0 },
                    leftFoot:      { x: 5, y: 0 },
                    rightFoot:     { x: -5, y: 0 }
                }
            },
            {
                // Airborne — everything moves UP
                time: 0.55,
                pose: {
                    head:          { x: 0, y: -42 },
                    neck:          { x: 0, y: -40 },
                    leftShoulder:  { x: -5, y: -40 },
                    rightShoulder: { x: 5, y: -40 },
                    leftElbow:     { x: -15, y: -50 },
                    rightElbow:    { x: 15, y: -50 },
                    leftHand:      { x: -20, y: -60 },
                    rightHand:     { x: 20, y: -60 },
                    hip:           { x: 0, y: -38 },
                    leftKnee:      { x: 0, y: -38 },
                    rightKnee:     { x: 0, y: -38 },
                    leftFoot:      { x: 5, y: -35 },
                    rightFoot:     { x: -5, y: -35 }
                }
            },
            {
                // Landing impact — slight crouch
                time: 0.8,
                pose: {
                    head:          { x: 0, y: 8 },
                    neck:          { x: 0, y: 6 },
                    leftShoulder:  { x: 0, y: 5 },
                    rightShoulder: { x: 0, y: 5 },
                    hip:           { x: 0, y: 6 },
                    leftKnee:      { x: 6, y: -2 },
                    rightKnee:     { x: -6, y: -2 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'kick',
        style: 'western',
        energy: 'high',
        durationBeats: 2,
        type: 'legs',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Wind up — slight lean back, leg chambering
                time: 0.2,
                pose: {
                    head:      { x: -5, y: 3 },
                    neck:      { x: -4, y: 2 },
                    hip:       { x: -5, y: 3 },
                    rightKnee: { x: -10, y: -20 },
                    rightFoot: { x: -5, y: -15 }
                }
            },
            {
                // Kick out — right leg high to the side, lean back
                time: 0.5,
                pose: {
                    head:          { x: -12, y: 8 },
                    neck:          { x: -10, y: 6 },
                    leftShoulder:  { x: -8, y: 4 },
                    rightShoulder: { x: -8, y: 4 },
                    hip:           { x: -8, y: 5 },
                    leftKnee:      { x: -3, y: 5 },
                    rightKnee:     { x: 50, y: -60 },
                    leftFoot:      { x: -3, y: 3 },
                    rightFoot:     { x: 80, y: -80 }
                }
            },
            {
                // Retract
                time: 0.75,
                pose: {
                    head:      { x: -3, y: 2 },
                    neck:      { x: -2, y: 1 },
                    hip:       { x: -2, y: 2 },
                    rightKnee: { x: 10, y: -15 },
                    rightFoot: { x: 15, y: -10 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'doubleArmWave',
        style: 'western',
        energy: 'high',
        durationBeats: 2,
        type: 'arms',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Arms sweeping out and up
                time: 0.3,
                pose: {
                    leftShoulder:  { x: -5, y: -5 },
                    rightShoulder: { x: 5, y: -5 },
                    leftElbow:     { x: -25, y: -45 },
                    rightElbow:    { x: 25, y: -45 },
                    leftHand:      { x: -40, y: -80 },
                    rightHand:     { x: 40, y: -80 }
                }
            },
            {
                // Peak — arms high and wide, hands waving inward
                time: 0.55,
                pose: {
                    leftShoulder:  { x: -5, y: -8 },
                    rightShoulder: { x: 5, y: -8 },
                    leftElbow:     { x: -20, y: -55 },
                    rightElbow:    { x: 20, y: -55 },
                    leftHand:      { x: -30, y: -100 },
                    rightHand:     { x: 30, y: -100 }
                }
            },
            {
                // Hands wave outward at the top
                time: 0.7,
                pose: {
                    leftShoulder:  { x: -5, y: -6 },
                    rightShoulder: { x: 5, y: -6 },
                    leftElbow:     { x: -28, y: -48 },
                    rightElbow:    { x: 28, y: -48 },
                    leftHand:      { x: -50, y: -85 },
                    rightHand:     { x: 50, y: -85 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'fullSpin',
        style: 'western',
        energy: 'high',
        durationBeats: 2,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Dramatic compression — all limbs pulled tight to center
                time: 0.35,
                pose: {
                    head:          { x: 0, y: -12 },
                    neck:          { x: 0, y: -8 },
                    leftShoulder:  { x: 25, y: -8 },
                    rightShoulder: { x: -25, y: -8 },
                    leftElbow:     { x: 55, y: -25 },
                    rightElbow:    { x: -55, y: -25 },
                    leftHand:      { x: 75, y: -40 },
                    rightHand:     { x: -75, y: -40 },
                    hip:           { x: 0, y: -5 },
                    leftKnee:      { x: 18, y: -8 },
                    rightKnee:     { x: -18, y: -8 },
                    leftFoot:      { x: 25, y: -5 },
                    rightFoot:     { x: -25, y: -5 }
                }
            },
            {
                // Still compressed, slight vertical shift to sell rotation
                time: 0.6,
                pose: {
                    head:          { x: 0, y: -10 },
                    neck:          { x: 0, y: -6 },
                    leftShoulder:  { x: 22, y: -6 },
                    rightShoulder: { x: -22, y: -6 },
                    leftElbow:     { x: 50, y: -20 },
                    rightElbow:    { x: -50, y: -20 },
                    leftHand:      { x: 68, y: -35 },
                    rightHand:     { x: -68, y: -35 },
                    hip:           { x: 0, y: -4 },
                    leftKnee:      { x: 15, y: -6 },
                    rightKnee:     { x: -15, y: -6 },
                    leftFoot:      { x: 22, y: -4 },
                    rightFoot:     { x: -22, y: -4 }
                }
            },
            {
                // Expanding back out — arms fling wide briefly
                time: 0.82,
                pose: {
                    leftShoulder:  { x: -8, y: -3 },
                    rightShoulder: { x: 8, y: -3 },
                    leftElbow:     { x: -15, y: -8 },
                    rightElbow:    { x: 15, y: -8 },
                    leftHand:      { x: -20, y: -12 },
                    rightHand:     { x: 20, y: -12 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'runningMan',
        style: 'western',
        energy: 'high',
        durationBeats: 4,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Step 1: Left leg forward, right arm forward
                time: 0.15,
                pose: {
                    head:          { x: 0, y: 5 },
                    neck:          { x: 0, y: 4 },
                    leftShoulder:  { x: 3, y: 0 },
                    rightShoulder: { x: -3, y: 0 },
                    leftElbow:     { x: -10, y: 12 },
                    rightElbow:    { x: 10, y: -20 },
                    leftHand:      { x: -15, y: 18 },
                    rightHand:     { x: 15, y: -35 },
                    hip:           { x: 0, y: 8 },
                    leftKnee:      { x: -20, y: -30 },
                    rightKnee:     { x: 10, y: 8 },
                    leftFoot:      { x: -30, y: -20 },
                    rightFoot:     { x: 20, y: 5 }
                }
            },
            {
                // Slide back: left leg sliding back, transitioning
                time: 0.35,
                pose: {
                    head:          { x: 0, y: 8 },
                    neck:          { x: 0, y: 6 },
                    hip:           { x: 0, y: 10 },
                    leftKnee:      { x: 5, y: 5 },
                    rightKnee:     { x: -5, y: 5 },
                    leftFoot:      { x: 10, y: 5 },
                    rightFoot:     { x: -10, y: 5 }
                }
            },
            {
                // Step 2: Right leg forward, left arm forward
                time: 0.6,
                pose: {
                    head:          { x: 0, y: 5 },
                    neck:          { x: 0, y: 4 },
                    leftShoulder:  { x: 3, y: 0 },
                    rightShoulder: { x: -3, y: 0 },
                    leftElbow:     { x: 10, y: -20 },
                    rightElbow:    { x: -10, y: 12 },
                    leftHand:      { x: 15, y: -35 },
                    rightHand:     { x: -15, y: 18 },
                    hip:           { x: 0, y: 8 },
                    leftKnee:      { x: -10, y: 8 },
                    rightKnee:     { x: 20, y: -30 },
                    leftFoot:      { x: -20, y: 5 },
                    rightFoot:     { x: 30, y: -20 }
                }
            },
            {
                // Slide back
                time: 0.82,
                pose: {
                    head:          { x: 0, y: 8 },
                    neck:          { x: 0, y: 6 },
                    hip:           { x: 0, y: 10 },
                    leftKnee:      { x: -5, y: 5 },
                    rightKnee:     { x: 5, y: 5 },
                    leftFoot:      { x: -10, y: 5 },
                    rightFoot:     { x: 10, y: 5 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'bodyRoll',
        style: 'universal',
        energy: 'high',
        durationBeats: 2,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Head and neck push forward
                time: 0.2,
                pose: {
                    head:          { x: 12, y: 5 },
                    neck:          { x: 8, y: 3 }
                }
            },
            {
                // Chest pushes forward, head coming back
                time: 0.4,
                pose: {
                    head:          { x: 4, y: 0 },
                    neck:          { x: 10, y: 5 },
                    leftShoulder:  { x: 8, y: 5 },
                    rightShoulder: { x: 8, y: 5 },
                    leftElbow:     { x: 5, y: 3 },
                    rightElbow:    { x: 5, y: 3 }
                }
            },
            {
                // Hips push forward, upper body coming back
                time: 0.65,
                pose: {
                    head:          { x: -5, y: -3 },
                    neck:          { x: -2, y: 0 },
                    leftShoulder:  { x: 2, y: 2 },
                    rightShoulder: { x: 2, y: 2 },
                    hip:           { x: 15, y: 5 },
                    leftKnee:      { x: 5, y: -3 },
                    rightKnee:     { x: 5, y: -3 }
                }
            },
            {
                // Hips settling back, knees absorb
                time: 0.85,
                pose: {
                    head:          { x: -2, y: -1 },
                    hip:           { x: 5, y: 2 },
                    leftKnee:      { x: 3, y: 2 },
                    rightKnee:     { x: 3, y: 2 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    // =========================================================================
    //  BONUS HIGH ENERGY MOVES
    // =========================================================================

    {
        name: 'dab',
        style: 'western',
        energy: 'high',
        durationBeats: 2,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Head drops into left elbow, right arm extends out
                time: 0.35,
                pose: {
                    head:          { x: -20, y: 15 },
                    neck:          { x: -15, y: 10 },
                    leftShoulder:  { x: -5, y: -5 },
                    rightShoulder: { x: 5, y: -5 },
                    leftElbow:     { x: -20, y: -40 },
                    rightElbow:    { x: 40, y: -35 },
                    leftHand:      { x: -35, y: -55 },
                    rightHand:     { x: 75, y: -60 },
                    hip:           { x: -5, y: 3 }
                }
            },
            {
                // Hold the dab
                time: 0.65,
                pose: {
                    head:          { x: -20, y: 15 },
                    neck:          { x: -15, y: 10 },
                    leftShoulder:  { x: -5, y: -5 },
                    rightShoulder: { x: 5, y: -5 },
                    leftElbow:     { x: -20, y: -40 },
                    rightElbow:    { x: 40, y: -35 },
                    leftHand:      { x: -35, y: -55 },
                    rightHand:     { x: 75, y: -60 },
                    hip:           { x: -5, y: 3 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'ymca',
        style: 'western',
        energy: 'mid',
        durationBeats: 4,
        type: 'arms',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Y — both arms up and out in a V
                time: 0.2,
                pose: {
                    leftElbow:     { x: -20, y: -45 },
                    rightElbow:    { x: 20, y: -45 },
                    leftHand:      { x: -45, y: -95 },
                    rightHand:     { x: 45, y: -95 }
                }
            },
            {
                // M — elbows out, hands touching head
                time: 0.45,
                pose: {
                    leftElbow:     { x: -30, y: -40 },
                    rightElbow:    { x: 30, y: -40 },
                    leftHand:      { x: -10, y: -85 },
                    rightHand:     { x: 10, y: -85 }
                }
            },
            {
                // C — arms curve to the left
                time: 0.7,
                pose: {
                    leftElbow:     { x: -10, y: -50 },
                    rightElbow:    { x: -15, y: -45 },
                    leftHand:      { x: -5, y: -90 },
                    rightHand:     { x: -25, y: -80 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    // =========================================================================
    //  ADDITIONAL ARM MOVES (for layered upper-body overlay)
    // =========================================================================

    {
        name: 'fingerGun',
        style: 'western',
        energy: 'mid',
        durationBeats: 2,
        type: 'arms',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                time: 0.25,
                pose: {
                    rightShoulder: { x: 5, y: -3 },
                    rightElbow:    { x: 25, y: -30 },
                    rightHand:     { x: 60, y: -50 }
                }
            },
            {
                // Recoil
                time: 0.4,
                pose: {
                    rightShoulder: { x: 3, y: -2 },
                    rightElbow:    { x: 20, y: -25 },
                    rightHand:     { x: 50, y: -40 }
                }
            },
            {
                // Second shot — other side
                time: 0.6,
                pose: {
                    leftShoulder:  { x: -5, y: -3 },
                    leftElbow:     { x: -25, y: -30 },
                    leftHand:      { x: -60, y: -50 }
                }
            },
            {
                time: 0.75,
                pose: {
                    leftShoulder:  { x: -3, y: -2 },
                    leftElbow:     { x: -20, y: -25 },
                    leftHand:      { x: -50, y: -40 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'shoulderRoll',
        style: 'universal',
        energy: 'low',
        durationBeats: 2,
        type: 'arms',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                time: 0.2,
                pose: {
                    leftShoulder:  { x: 0, y: -10 },
                    leftElbow:     { x: -5, y: -8 },
                    rightShoulder: { x: 0, y: 3 }
                }
            },
            {
                time: 0.5,
                pose: {
                    leftShoulder:  { x: 0, y: 3 },
                    rightShoulder: { x: 0, y: -10 },
                    rightElbow:    { x: 5, y: -8 }
                }
            },
            {
                time: 0.8,
                pose: {
                    leftShoulder:  { x: 0, y: -10 },
                    leftElbow:     { x: -5, y: -8 },
                    rightShoulder: { x: 0, y: 3 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'elbowPump',
        style: 'western',
        energy: 'high',
        durationBeats: 1,
        type: 'arms',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                time: 0.3,
                pose: {
                    leftShoulder:  { x: 5, y: -8 },
                    rightShoulder: { x: -5, y: -8 },
                    leftElbow:     { x: 25, y: -35 },
                    rightElbow:    { x: -25, y: -35 },
                    leftHand:      { x: 15, y: -20 },
                    rightHand:     { x: -15, y: -20 }
                }
            },
            {
                time: 0.6,
                pose: {
                    leftShoulder:  { x: 5, y: -5 },
                    rightShoulder: { x: -5, y: -5 },
                    leftElbow:     { x: 20, y: -25 },
                    rightElbow:    { x: -20, y: -25 },
                    leftHand:      { x: 10, y: -15 },
                    rightHand:     { x: -10, y: -15 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    // =========================================================================
    //  ADDITIONAL FULL-BODY GROOVE MOVES
    // =========================================================================

    {
        name: 'twoStep',
        style: 'universal',
        energy: 'mid',
        durationBeats: 2,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Step left, lean into it
                time: 0.2,
                pose: {
                    head:          { x: -15, y: 8 },
                    neck:          { x: -12, y: 6 },
                    hip:           { x: -10, y: 8 },
                    leftKnee:      { x: -20, y: -10 },
                    rightKnee:     { x: -5, y: 8 },
                    leftFoot:      { x: -30, y: 0 },
                    rightFoot:     { x: 5, y: 0 }
                }
            },
            {
                time: 0.4,
                pose: {
                    head:          { x: -8, y: 3 },
                    neck:          { x: -6, y: 2 },
                    hip:           { x: -5, y: 3 }
                }
            },
            {
                // Step right, lean into it
                time: 0.65,
                pose: {
                    head:          { x: 15, y: 8 },
                    neck:          { x: 12, y: 6 },
                    hip:           { x: 10, y: 8 },
                    leftKnee:      { x: 5, y: 8 },
                    rightKnee:     { x: 20, y: -10 },
                    leftFoot:      { x: -5, y: 0 },
                    rightFoot:     { x: 30, y: 0 }
                }
            },
            {
                time: 0.85,
                pose: {
                    head:          { x: 8, y: 3 },
                    neck:          { x: 6, y: 2 },
                    hip:           { x: 5, y: 3 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'grooveBounce',
        style: 'universal',
        energy: 'low',
        durationBeats: 2,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Deep bounce down
                time: 0.2,
                pose: {
                    head:          { x: 0, y: 18 },
                    neck:          { x: 0, y: 15 },
                    leftShoulder:  { x: -3, y: 12 },
                    rightShoulder: { x: 3, y: 12 },
                    hip:           { x: 0, y: 14 },
                    leftKnee:      { x: 8, y: -8 },
                    rightKnee:     { x: -8, y: -8 }
                }
            },
            {
                time: 0.4,
                pose: {
                    head:          { x: 0, y: 3 },
                    neck:          { x: 0, y: 2 }
                }
            },
            {
                // Bounce again
                time: 0.7,
                pose: {
                    head:          { x: 0, y: 15 },
                    neck:          { x: 0, y: 12 },
                    leftShoulder:  { x: 3, y: 10 },
                    rightShoulder: { x: -3, y: 10 },
                    hip:           { x: 0, y: 12 },
                    leftKnee:      { x: -6, y: -6 },
                    rightKnee:     { x: 6, y: -6 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'slideShuffle',
        style: 'western',
        energy: 'high',
        durationBeats: 2,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Slide left
                time: 0.2,
                pose: {
                    head:      { x: -30, y: 5 },
                    neck:      { x: -28, y: 4 },
                    leftShoulder:  { x: -25, y: 3 },
                    rightShoulder: { x: -25, y: 3 },
                    leftElbow:     { x: -22, y: 2 },
                    rightElbow:    { x: -22, y: 2 },
                    leftHand:      { x: -20, y: 2 },
                    rightHand:     { x: -20, y: 2 },
                    hip:       { x: -25, y: 5 },
                    leftKnee:  { x: -30, y: -5 },
                    rightKnee: { x: -15, y: 8 },
                    leftFoot:  { x: -40, y: 0 },
                    rightFoot: { x: -10, y: 0 }
                }
            },
            {
                time: 0.45,
                pose: {}
            },
            {
                // Slide right
                time: 0.7,
                pose: {
                    head:      { x: 30, y: 5 },
                    neck:      { x: 28, y: 4 },
                    leftShoulder:  { x: 25, y: 3 },
                    rightShoulder: { x: 25, y: 3 },
                    leftElbow:     { x: 22, y: 2 },
                    rightElbow:    { x: 22, y: 2 },
                    leftHand:      { x: 20, y: 2 },
                    rightHand:     { x: 20, y: 2 },
                    hip:       { x: 25, y: 5 },
                    leftKnee:  { x: 15, y: 8 },
                    rightKnee: { x: 30, y: -5 },
                    leftFoot:  { x: 10, y: 0 },
                    rightFoot: { x: 40, y: 0 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    // =========================================================================
    //  INDIAN / BOLLYWOOD-INSPIRED MOVES
    //  (dhol-tasha, lavani, Bollywood energy)
    // =========================================================================

    {
        name: 'shoulderShimmy',
        style: 'indian',
        energy: 'mid',
        durationBeats: 2,
        type: 'arms',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Left shoulder forward, right back
                time: 0.1,
                pose: {
                    leftShoulder:  { x: 8, y: -6 },
                    rightShoulder: { x: -8, y: 6 },
                    leftElbow:     { x: 10, y: -4 },
                    rightElbow:    { x: -10, y: 4 }
                }
            },
            {
                // Right shoulder forward, left back
                time: 0.25,
                pose: {
                    leftShoulder:  { x: -8, y: 6 },
                    rightShoulder: { x: 8, y: -6 },
                    leftElbow:     { x: -10, y: 4 },
                    rightElbow:    { x: 10, y: -4 }
                }
            },
            {
                time: 0.4,
                pose: {
                    leftShoulder:  { x: 8, y: -6 },
                    rightShoulder: { x: -8, y: 6 },
                    leftElbow:     { x: 10, y: -4 },
                    rightElbow:    { x: -10, y: 4 }
                }
            },
            {
                time: 0.55,
                pose: {
                    leftShoulder:  { x: -8, y: 6 },
                    rightShoulder: { x: 8, y: -6 },
                    leftElbow:     { x: -10, y: 4 },
                    rightElbow:    { x: 10, y: -4 }
                }
            },
            {
                time: 0.7,
                pose: {
                    leftShoulder:  { x: 8, y: -6 },
                    rightShoulder: { x: -8, y: 6 },
                    leftElbow:     { x: 10, y: -4 },
                    rightElbow:    { x: -10, y: 4 }
                }
            },
            {
                time: 0.85,
                pose: {
                    leftShoulder:  { x: -8, y: 6 },
                    rightShoulder: { x: 8, y: -6 },
                    leftElbow:     { x: -10, y: 4 },
                    rightElbow:    { x: 10, y: -4 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'thumka',
        style: 'indian',
        energy: 'mid',
        durationBeats: 2,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Hip thrust to the right with a dip
                time: 0.2,
                pose: {
                    head:          { x: -8, y: 8 },
                    neck:          { x: -5, y: 6 },
                    hip:           { x: 25, y: 8 },
                    leftKnee:      { x: 10, y: -8 },
                    rightKnee:     { x: 5, y: 5 },
                    leftFoot:      { x: 5, y: 0 },
                    rightFoot:     { x: 0, y: 0 }
                }
            },
            {
                // Bounce back through center
                time: 0.4,
                pose: {
                    head:          { x: 0, y: 3 },
                    hip:           { x: 0, y: 3 }
                }
            },
            {
                // Hip thrust to the left with a dip
                time: 0.6,
                pose: {
                    head:          { x: 8, y: 8 },
                    neck:          { x: 5, y: 6 },
                    hip:           { x: -25, y: 8 },
                    leftKnee:      { x: -5, y: 5 },
                    rightKnee:     { x: -10, y: -8 },
                    leftFoot:      { x: 0, y: 0 },
                    rightFoot:     { x: -5, y: 0 }
                }
            },
            {
                time: 0.8,
                pose: {
                    head:          { x: 0, y: 3 },
                    hip:           { x: 0, y: 3 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'headTilt',
        style: 'indian',
        energy: 'low',
        durationBeats: 2,
        type: 'arms',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Head tilts left (classic Indian head movement)
                time: 0.15,
                pose: {
                    head: { x: -15, y: 0 },
                    neck: { x: -5, y: 0 }
                }
            },
            {
                // Head tilts right
                time: 0.35,
                pose: {
                    head: { x: 15, y: 0 },
                    neck: { x: 5, y: 0 }
                }
            },
            {
                time: 0.55,
                pose: {
                    head: { x: -15, y: 0 },
                    neck: { x: -5, y: 0 }
                }
            },
            {
                time: 0.75,
                pose: {
                    head: { x: 15, y: 0 },
                    neck: { x: 5, y: 0 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'bollywoodArms',
        style: 'indian',
        energy: 'high',
        durationBeats: 2,
        type: 'arms',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Both arms sweep up and out — classic Bollywood opening
                time: 0.2,
                pose: {
                    leftShoulder:  { x: -5, y: -8 },
                    rightShoulder: { x: 5, y: -8 },
                    leftElbow:     { x: -30, y: -50 },
                    rightElbow:    { x: 30, y: -50 },
                    leftHand:      { x: -55, y: -90 },
                    rightHand:     { x: 55, y: -90 }
                }
            },
            {
                // Wrists twist inward (simulated — hands cross over)
                time: 0.4,
                pose: {
                    leftShoulder:  { x: -3, y: -6 },
                    rightShoulder: { x: 3, y: -6 },
                    leftElbow:     { x: -15, y: -45 },
                    rightElbow:    { x: 15, y: -45 },
                    leftHand:      { x: 10, y: -85 },
                    rightHand:     { x: -10, y: -85 }
                }
            },
            {
                // Arms sweep out again
                time: 0.6,
                pose: {
                    leftShoulder:  { x: -5, y: -8 },
                    rightShoulder: { x: 5, y: -8 },
                    leftElbow:     { x: -30, y: -50 },
                    rightElbow:    { x: 30, y: -50 },
                    leftHand:      { x: -55, y: -90 },
                    rightHand:     { x: 55, y: -90 }
                }
            },
            {
                // Wrists twist again
                time: 0.8,
                pose: {
                    leftShoulder:  { x: -3, y: -6 },
                    rightShoulder: { x: 3, y: -6 },
                    leftElbow:     { x: -15, y: -45 },
                    rightElbow:    { x: 15, y: -45 },
                    leftHand:      { x: 10, y: -85 },
                    rightHand:     { x: -10, y: -85 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'lavaniStomp',
        style: 'indian',
        energy: 'high',
        durationBeats: 2,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Stomp right — deep grounded stance, arms wide
                time: 0.2,
                pose: {
                    head:          { x: 10, y: 15 },
                    neck:          { x: 8, y: 12 },
                    leftShoulder:  { x: -5, y: 10 },
                    rightShoulder: { x: 5, y: 10 },
                    leftElbow:     { x: -20, y: -5 },
                    rightElbow:    { x: 25, y: -10 },
                    leftHand:      { x: -35, y: -15 },
                    rightHand:     { x: 45, y: -25 },
                    hip:           { x: 15, y: 15 },
                    leftKnee:      { x: -5, y: 5 },
                    rightKnee:     { x: 25, y: -15 },
                    leftFoot:      { x: -5, y: 0 },
                    rightFoot:     { x: 30, y: 0 }
                }
            },
            {
                // Rise up through center
                time: 0.45,
                pose: {
                    head:          { x: 0, y: -5 },
                    neck:          { x: 0, y: -3 }
                }
            },
            {
                // Stomp left — mirror
                time: 0.7,
                pose: {
                    head:          { x: -10, y: 15 },
                    neck:          { x: -8, y: 12 },
                    leftShoulder:  { x: -5, y: 10 },
                    rightShoulder: { x: 5, y: 10 },
                    leftElbow:     { x: -25, y: -10 },
                    rightElbow:    { x: 20, y: -5 },
                    leftHand:      { x: -45, y: -25 },
                    rightHand:     { x: 35, y: -15 },
                    hip:           { x: -15, y: 15 },
                    leftKnee:      { x: -25, y: -15 },
                    rightKnee:     { x: 5, y: 5 },
                    leftFoot:      { x: -30, y: 0 },
                    rightFoot:     { x: 5, y: 0 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'dholBounce',
        style: 'indian',
        energy: 'mid',
        durationBeats: 2,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Heavy bounce down — like hitting a dhol beat
                time: 0.15,
                pose: {
                    head:          { x: 0, y: 20 },
                    neck:          { x: 0, y: 16 },
                    leftShoulder:  { x: -5, y: 14 },
                    rightShoulder: { x: 5, y: 14 },
                    leftElbow:     { x: -8, y: 12 },
                    rightElbow:    { x: 8, y: 12 },
                    hip:           { x: 0, y: 16 },
                    leftKnee:      { x: 12, y: -10 },
                    rightKnee:     { x: -12, y: -10 }
                }
            },
            {
                // Spring up
                time: 0.35,
                pose: {
                    head:          { x: 0, y: -8 },
                    neck:          { x: 0, y: -5 },
                    leftShoulder:  { x: -3, y: -5 },
                    rightShoulder: { x: 3, y: -5 }
                }
            },
            {
                // Second heavy bounce
                time: 0.6,
                pose: {
                    head:          { x: 0, y: 20 },
                    neck:          { x: 0, y: 16 },
                    leftShoulder:  { x: 5, y: 14 },
                    rightShoulder: { x: -5, y: 14 },
                    leftElbow:     { x: 8, y: 12 },
                    rightElbow:    { x: -8, y: 12 },
                    hip:           { x: 0, y: 16 },
                    leftKnee:      { x: -10, y: -10 },
                    rightKnee:     { x: 10, y: -10 }
                }
            },
            {
                // Spring up
                time: 0.8,
                pose: {
                    head:          { x: 0, y: -5 },
                    neck:          { x: 0, y: -3 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'namaskarArms',
        style: 'indian',
        energy: 'low',
        durationBeats: 2,
        type: 'arms',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Hands come together in namaskar at chest
                time: 0.25,
                pose: {
                    leftElbow:     { x: 15, y: -15 },
                    rightElbow:    { x: -15, y: -15 },
                    leftHand:      { x: 80, y: -50 },
                    rightHand:     { x: -80, y: -50 }
                }
            },
            {
                // Raise namaskar above head
                time: 0.5,
                pose: {
                    leftShoulder:  { x: 3, y: -5 },
                    rightShoulder: { x: -3, y: -5 },
                    leftElbow:     { x: 20, y: -40 },
                    rightElbow:    { x: -20, y: -40 },
                    leftHand:      { x: 80, y: -90 },
                    rightHand:     { x: -80, y: -90 }
                }
            },
            {
                // Back to chest
                time: 0.75,
                pose: {
                    leftElbow:     { x: 15, y: -15 },
                    rightElbow:    { x: -15, y: -15 },
                    leftHand:      { x: 80, y: -50 },
                    rightHand:     { x: -80, y: -50 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    },

    {
        name: 'bhangra',
        style: 'indian',
        energy: 'high',
        durationBeats: 4,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: {} },
            {
                // Squat with one arm up — classic bhangra
                time: 0.15,
                pose: {
                    head:          { x: 0, y: 20 },
                    neck:          { x: 0, y: 16 },
                    leftShoulder:  { x: -3, y: 12 },
                    rightShoulder: { x: 3, y: -5 },
                    leftElbow:     { x: -5, y: 10 },
                    rightElbow:    { x: 15, y: -45 },
                    leftHand:      { x: -8, y: 8 },
                    rightHand:     { x: 20, y: -90 },
                    hip:           { x: 0, y: 18 },
                    leftKnee:      { x: 15, y: -15 },
                    rightKnee:     { x: -15, y: -15 },
                    leftFoot:      { x: 10, y: 0 },
                    rightFoot:     { x: -10, y: 0 }
                }
            },
            {
                // Spring up, kick right leg
                time: 0.35,
                pose: {
                    head:          { x: 0, y: -10 },
                    neck:          { x: 0, y: -8 },
                    rightElbow:    { x: 15, y: -45 },
                    rightHand:     { x: 20, y: -90 },
                    hip:           { x: 0, y: -5 },
                    rightKnee:     { x: 20, y: -30 },
                    rightFoot:     { x: 35, y: -25 }
                }
            },
            {
                // Squat again, other arm up
                time: 0.55,
                pose: {
                    head:          { x: 0, y: 20 },
                    neck:          { x: 0, y: 16 },
                    leftShoulder:  { x: -3, y: -5 },
                    rightShoulder: { x: 3, y: 12 },
                    leftElbow:     { x: -15, y: -45 },
                    rightElbow:    { x: 5, y: 10 },
                    leftHand:      { x: -20, y: -90 },
                    rightHand:     { x: 8, y: 8 },
                    hip:           { x: 0, y: 18 },
                    leftKnee:      { x: 15, y: -15 },
                    rightKnee:     { x: -15, y: -15 },
                    leftFoot:      { x: 10, y: 0 },
                    rightFoot:     { x: -10, y: 0 }
                }
            },
            {
                // Spring up, kick left leg
                time: 0.75,
                pose: {
                    head:          { x: 0, y: -10 },
                    neck:          { x: 0, y: -8 },
                    leftElbow:     { x: -15, y: -45 },
                    leftHand:      { x: -20, y: -90 },
                    hip:           { x: 0, y: -5 },
                    leftKnee:      { x: -20, y: -30 },
                    leftFoot:      { x: -35, y: -25 }
                }
            },
            { time: 1.0, pose: {} }
        ]
    }
];

/**
 * Get all defined dance moves.
 * @returns {Array} All move objects
 */
export function getAllMoves() {
    return MOVES;
}

/**
 * Filter moves by energy level.
 * @param {'low'|'mid'|'high'} energy
 * @returns {Array} Moves matching the given energy level
 */
export function getMovesByEnergy(energy) {
    return MOVES.filter(m => m.energy === energy);
}

/**
 * Get moves filtered by energy AND style preference.
 * @param {'low'|'mid'|'high'} energy
 * @param {number} styleScore  0 = Western, 1 = Indian
 * @returns {Array} Moves weighted toward the detected style
 */
export function getStyledMoves(energy, styleScore) {
    const all = MOVES.filter(m => m.energy === energy);
    if (styleScore > 0.55) {
        // Indian-leaning: prefer indian + universal, exclude western
        const preferred = all.filter(m => m.style === 'indian' || m.style === 'universal');
        return preferred.length > 0 ? preferred : all;
    } else if (styleScore < 0.35) {
        // Western-leaning: prefer western + universal, exclude indian
        const preferred = all.filter(m => m.style === 'western' || m.style === 'universal');
        return preferred.length > 0 ? preferred : all;
    }
    // Neutral: use everything
    return all;
}

/**
 * Find a single move by its unique name.
 * @param {string} name
 * @returns {Object|undefined} The move object, or undefined if not found
 */
export function getMoveByName(name) {
    return MOVES.find(m => m.name === name);
}
