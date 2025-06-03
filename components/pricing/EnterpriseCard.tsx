"use client";
import { Building2, Check } from "lucide-react";
import Link from "next/link";

export function EnterpriseCard({ isCurrent, isLower }: { isCurrent: boolean; isLower: boolean }) {
    return (
        <div
            className={`pt-6 border-2 rounded-xl p-8 bg-white relative flex flex-col h-full transition
        ${isCurrent ? "border-orange-500 shadow-lg" : isLower ? "border-gray-200 opacity-60 grayscale" : "border-orange-300"}
      `}
        >
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-lg bg-gray-900">
                    <Building2 className="h-3 w-3" />
                    Enterprise
                </div>
            </div>
            <h2 className="text-2xl font-medium text-gray-900 mb-2">Enterprise</h2>
            <p className="text-sm text-gray-600 mb-4">
                Custom fine-tuned solutions for your organization
            </p>
            <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-black mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">
            Host Tesslate's models on your own infrastructure
          </span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-black mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">
            Private deployment & custom integrations
          </span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-black mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">
            Designed for secure, scalable usage in enterprise settings
          </span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-black mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">
            Dedicated support and SLAs
          </span>
                </li>
                <li className="flex items-start">
                    <Check className="h-5 w-5 text-black mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">
            Custom model fine-tuning options
          </span>
                </li>
            </ul>
            <div className="mt-auto">
                <p className="text-4xl font-medium text-gray-900 mb-2">Custom</p>
                <p className="text-sm text-gray-600 mb-6">Contact for pricing</p>
                <Link
                    href="https://calendly.com/team-tesslate"
                    target="_blank"
                    className="w-full block rounded-full bg-black text-white py-2 font-medium text-center hover:bg-gray-900 transition"
                >
                    Contact Us
                </Link>
            </div>
        </div>
    );
}
