"use client";

import React from "react";
import { usePreferences } from "@/context/preferences-context";

export default function DictionaryPanel() {
  const { t } = usePreferences();

  return (
    <div className="text-center py-8">
      <p className="text-muted-foreground">
        {t('noTermsYet') || 'No terms yet. Select text to add to dictionary.'}
      </p>
    </div>
  );
}