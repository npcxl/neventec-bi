import './baseLoading.css';

export default function BaseLoading() {
    return (
        <div className="base-loading" aria-label="加载中" role="status">
            <svg className="circuit" viewBox="0 0 80 60" width="64" height="48">
                <path
                    d="M8,30 H22 V12 H58 V30 H72 M58,30 V48 H22 V30"
                    fill="none"
                    stroke="#2DD4BF"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.18"
                />

                <path
                    className="trace"
                    d="M8,30 H22 V12 H58 V30 H72 M58,30 V48 H22 V30"
                    fill="none"
                    stroke="#2DD4BF"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                <circle r="3.5" fill="#FFD93D">
                    <animateMotion dur="3s" repeatCount="indefinite">
                        <mpath href="#guide" />
                    </animateMotion>
                </circle>

                <path id="guide" d="M8,30 H22 V12 H58 V30 H72 M58,30 V48 H22 V30" fill="none" />

                <circle cx="22" cy="12" r="2.5" fill="#2DD4BF" opacity="0.55" />
                <circle cx="58" cy="12" r="2.5" fill="#2DD4BF" opacity="0.55" />
                <circle cx="22" cy="48" r="2.5" fill="#2DD4BF" opacity="0.55" />
                <circle cx="58" cy="48" r="2.5" fill="#2DD4BF" opacity="0.55" />
            </svg>
        </div>
    );
}
